const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const createRoom = async (req, res) => {
    try {
      const { roomName, roomCode, testModule, startDate, startTime, endTime } = req.body
  
      if (!roomName || !roomCode || !testModule || !startDate || !startTime || !endTime) {
        return res.status(400).json({
          message: "All fields are required",
        })
      }
  
      const existingRoom = await prisma.$transaction([
        prisma.activeRoom.findUnique({ where: { roomCode } }),
        prisma.scheduledRoom.findUnique({ where: { roomCode } }),
        prisma.pastRoom.findUnique({ where: { roomCode } }),
      ])
  
      if (existingRoom.some((room) => room !== null)) {
        return res.status(400).json({
          message: "Room code already exists. Please choose a different code.",
        })
      }
  
      const parsedStartTime = new Date(`${startDate}T${startTime}`)
      const parsedEndTime = new Date(`${startDate}T${endTime}`)
  
      const roomData = {
        roomName,
        roomCode,
        testModuleId: testModule, 
        startTime: parsedStartTime,
        endTime: parsedEndTime,
      }
  
      if (parsedStartTime > new Date()) {
        const futureRoom = await prisma.scheduledRoom.create({
          data: roomData,
        })
  
        return res.status(200).json({
          message: "Room scheduled successfully",
          roomCode: futureRoom.roomCode,
        })
      } else {
        const activeRoom = await prisma.activeRoom.create({
          data: roomData,
        })
  
        return res.status(201).json({
          message: "Room created successfully",
          roomCode: activeRoom.roomCode,
        })
      }
    } catch (err) {
      console.error("Error creating room:", err)
      return res.status(500).json({
        message: "Internal Server Error",
      })
    }
}

const transferExpiredRooms = async () => {
    try {
        const now = new Date()

        const expiredRooms = await prisma.activeRoom.findMany({
            where: {
                endTime: { lte: now} 
            }
        })

        for (const room of expiredRooms) {

            const existingPastRoom = await prisma.pastRoom.findUnique({
                where: {
                    roomCode: room.roomCode
                }
            })

            if (!existingPastRoom) {
                await prisma.pastRoom.create({
                    data: {
                        roomName: room.roomName,
                        roomCode: room.roomCode,
                        testModuleId: room.testModuleId,
                        startTime: room.startTime,
                        endTime: room.endTime
                    }
                })
            }

            const leaderboardEntries = await prisma.leaderbaord.findMany({
                where: { roomId: room.id },
            })

            for (const entry of leaderboardEntries) {
                await prisma.leaderbaord.update({
                    where: { id: entry.id },
                    data: { 
                        room: {
                            disconnect: true
                        },
                     },
                })
            }

            await prisma.activeRoom.delete({
                where: { id: room.id }
            })
        }

        console.log(`Transferred ${expiredRooms.length} expiry rooms`)
    } catch (err) {
        console.log("Error transferring expired rooms:", err)
    }
}

const activateScheuledRooms = async () => {
    try {
        const now = new Date()

        const roomsToActivate = await prisma.scheduledRoom.findMany({
            where: {
                startTime: { lte: now }
            },
            include: {
                testModule: true
            }
        })

        for (const room of roomsToActivate) {
            await prisma.activeRoom.create({
                data: {
                    roomName: room.roomName,
                    roomCode: room.roomCode,
                    testModuleId: room.testModuleId,
                    startTime: room.startTime,
                    endTime: room.endTime
                }
            })

            await prisma.scheduledRoom.delete({
                where: { id: room.id }
            })
        }
        console.log(`Activated ${roomsToActivate.length} scheduled rooms`)
    } catch (err) {
        console.log("Error activating scheduled rooms:", err)
    }
}

const getActiveRooms = async (req, res) => {
    try {
        const activeRooms = await prisma.activeRoom.findMany({
            include: {
                testModule: {
                    include: {
                        questions: true
                    }
                }
            }
        })

        const now = new Date()

        const detailedRooms = activeRooms.map((room) => {
            const timeLeft = 
                Math.max(0, new Date(room.endTime) - new Date(room.startTime)) / 1000 / 60
            return {
                id: room.id,
                roomName: room.roomName,
                totalQuestions: room.testModule.questions.length,
                timeLeft: timeLeft.toFixed(0)
            }
        })

        res.status(200).json({
            activeRooms: detailedRooms
        })
    } catch (err) {
        console.error("Error fetching active rooms:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const getPastRooms = async (req, res) => {
    try {
        const studentId  = req.user.id

        if(!studentId) {
            return res.status(400).json({
                message: "Student ID is required"
            })
        }

        const pastRooms = await prisma.pastRoom.findMany({
            include: {
                testModule: {
                    include: {
                        questions: true
                    }
                }
            }
        })

        const quizAttempts = await prisma.quizAttempt.findMany({
            where: {
                studentId
            }
        })

        const leaderboardEntries = await prisma.leaderbaord.findMany({
            where: {
                studentId
            }
        })

        const detailedRooms = pastRooms.map((room) => {
            const quizAttempt = quizAttempts.find((attempt) => {
                attempt.roomId === room.id
            })

            const leaderboardEntry = leaderboardEntries.find((entry) => {
                entry.roomId === room.id
            })

            const totalQuestions = room.testModule.questions.length
            const attemptedQuestions = quizAttempt?.answers ? Object.keys(quizAttempt.answers).length : 0
            const correctAnswers = quizAttempt?.score || 0
            const scorePercentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : "0"
            const rank = leaderboardEntry?.rank | "NA"

            return {
                roomName: room.roomName,
                totalQuestions,
                attemptedQuestions,
                correctAnswers,
                scorePercentage: `${scorePercentage}%`,
                rank
            }

        })
        res.status(200).json({
            pastRooms: detailedRooms
        })
    } catch (err) {
        console.error("Error fetching past rooms:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const verifyRoomCode = async (req, res) => {
    try {
        const { roomId, roomCode } = req.body

        if (!roomId || !roomCode) {
            return res.status(400).json({
                message: "Room ID and Room Code are required",
            })
        }

        const room = await prisma.activeRoom.findUnique({
            where: {
                id: roomId,
            },
        })

        if (!room) {
            return res.status(404).json({
                message: "Room not found",
            })
        }

        if (room.roomCode !== roomCode) {
            return res.status(400).json({
                message: "Invalid Room Code",
            })
        }

        res.status(200).json({
            message: "Room Code is valid",
        })
    } catch (err) {
        console.error("Error verifying room code:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

const getScheduleRooms = async (req, res) => {
    try {
        const scheduledRooms = await prisma.scheduledRoom.findMany({
            include: {
                testModule: {
                    include: {
                        questions: true
                    }
                }
            }   
        })

        const detailedRooms = scheduledRooms.map((room) => {
            const timeLeft = 
                Math.max(0, new Date(room.endTime) - new Date(room.startTime)) / 1000 / 60
            return {
                id: room.id,
                roomName: room.roomName,
                totalQuestions: room.testModule.questions.length,
                timeLeft: timeLeft.toFixed(0)
            }
        })

        res.status(200).json({
            scheduledRooms: detailedRooms
        })
    } catch (err) {
        console.error("Error fetching scheduled rooms:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const activateScheuledRoomNow = async (req, res) => {
    try {
        const { roomId } = req.params

        if (!roomId) {
            return res.status(400).json({
                message: "Room ID is required"
            })
        }

        const room = await prisma.scheduledRoom.findUnique({
            where: { id: roomId },
            include: {
                testModule: true
            }
        })

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            })
        }

        const newActiveRoom = await prisma.activeRoom.create({
            data: {
                roomName: room.roomName,
                roomCode: room.roomCode,
                testModuleId: room.testModuleId,
                startTime: room.startTime,
                endTime: room.endTime
            }
        })

        await prisma.scheduledRoom.delete({
            where: { id: roomId }
        })

        res.status(200).json({
            message: "Room activated successfully",
            activeRoom: newActiveRoom
        })
    } catch (err) {
        console.error("Error activating scheduled room:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const getPastRoomForInstructors = async (req, res) => {
    try {
        const pastRooms = await prisma.pastRoom.findMany({
            include: {
                testModule: {  
                    include: {
                        questions: true,  
                    },
                },
                QuizAttempt: true, 
            },
        })

        if (pastRooms.length === 0) {
            return res.status(404).json({
                message: "No past rooms found",
            })
        }

        const detailedRooms = pastRooms.map((room) => {
            const attempts = room.QuizAttempt || []
            const scores = attempts.map((attempt) => attempt.score)

            const totalQuestions = room.testModule.questions.length 
            const maxScore = scores.length ? Math.max(...scores) : 0
            const meanScore = scores.length
                ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)
                : 0
            const minScore = scores.length ? Math.min(...scores) : 0

            return {
                roomName: room.roomName,
                moduleName: room.testModule.name, 
                totalQuestions,
                maxScore,
                meanScore,
                minScore,
            }
        })

        res.status(200).json({
            pastRooms: detailedRooms,
        })
    } catch (err) {
        console.error("Error fetching past rooms for instructors:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

module.exports = { 
    createRoom, 
    transferExpiredRooms, 
    activateScheuledRooms,
    getActiveRooms,
    getPastRooms,
    verifyRoomCode, 
    getScheduleRooms,
    activateScheuledRoomNow,
    getPastRoomForInstructors
}