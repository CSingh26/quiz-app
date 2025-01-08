const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const createRoom = async (req, res) => {
    try {
        const { roomName, roomCode, testModule, startDate, startTime, endTime } = req.body

        if (!roomName || !roomCode || !testModule || !startDate || !startTime || !endTime) {
            return res.status(400).json({ 
                message: "All fields are required" 
            })
        }

        const existingRoom = await prisma.$transaction([
            prisma.activeRoom.findUnique({ where: { roomCode } }),
            prisma.scheduledRoom.findUnique({ where: { roomCode } }),
            prisma.pastRoom.findUnique({ where: { roomCode } }),
        ])

        if (existingRoom.some((room) => room !== null)) {
            return res.status(400).json({ 
                message: "Room code already exists. Please choose a different code." 
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
                data: roomData 
            })
            return res.status(200).json({ 
                message: "Room scheduled successfully", roomCode: futureRoom.roomCode 
            })
        } else {
            const activeRoom = await prisma.activeRoom.create({ 
                data: roomData 
            })
            return res.status(201).json({ 
                message: "Room created successfully", roomCode: activeRoom.roomCode 
            })
        }
    } catch (err) {
        console.error("Error creating room:", err)
        return res.status(500).json({ 
            message: "Internal Server Error" 
        })
    }
}

const transferExpiredRooms = async () => {
    try {
        const now = new Date()

        const expiredRooms = await prisma.activeRoom.findMany({
            where: { endTime: { lte: now } },
        })

        for (const room of expiredRooms) {
            const existingPastRoom = await prisma.pastRoom.findUnique({
                where: { roomCode: room.roomCode },
            })

            if (!existingPastRoom) {
                await prisma.pastRoom.create({
                    data: {
                        roomName: room.roomName,
                        roomCode: room.roomCode,
                        testModuleId: room.testModuleId,
                        startTime: room.startTime,
                        endTime: room.endTime,
                    },
                })
            }

            await prisma.activeRoom.delete({ where: { id: room.id } })
        }
        console.log(`Transferred ${expiredRooms.length} expired rooms`)
    } catch (err) {
        console.log("Error transferring expired rooms:", err)
    }
}

const activateScheuledRooms = async () => {
    try {
        const now = new Date()

        const roomsToActivate = await prisma.scheduledRoom.findMany({
            where: { startTime: { lte: now } },
        })

        for (const room of roomsToActivate) {
            await prisma.activeRoom.create({
                data: {
                    roomName: room.roomName,
                    roomCode: room.roomCode,
                    testModuleId: room.testModuleId,
                    startTime: room.startTime,
                    endTime: room.endTime,
                },
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
            },
        })

        const detailedRooms = activeRooms.map((room) => ({
            id: room.id,
            roomName: room.roomName,
            totalTime: Math.floor((new Date(room.endTime) - new Date(room.startTime)) / 60000),
            totalQuestions: room.testModule.questions.length,
        }))

        res.status(200).json({ 
            activeRooms: detailedRooms 
        })
    } catch (err) {
        console.error("Error fetching active rooms:", err)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

const getPastRooms = async (req, res) => {
    try {
        const studentId = req.user.id

        if (!studentId) {
            return res.status(400).json({ 
                message: "Student ID is required" 
            })
        }

        const pastRooms = await prisma.pastRoom.findMany({
            where: {
                quizAttempts: {
                    some: {
                        studentId
                    }
                }
            },
            include: { 
                testModule: { 
                    include: { 
                        questions: true 
                    } 
                } 
            }
        })

        const quizAttempts = await prisma.quizAttempt.findMany({
            where: { studentId },
        })

        const leaderboardEntries = await prisma.leaderbaord.findMany({
            where: { studentId },
        })

        const detailedRooms = pastRooms.map((room) => {
            const quizAttempt = quizAttempts.find(
                (attempt) => attempt.roomName === room.roomName
            )
            const leaderboardEntry = leaderboardEntries.find(
                (entry) => entry.roomName === room.roomName
            )

            const totalQuestions = room.testModule.questions.length
            const attemptedQuestions = quizAttempt?.answers 
                ? Object.keys(quizAttempt.answers).length 
                : 0
            const correctAnswers = quizAttempt?.score || 0
            const scorePercentage = totalQuestions > 0 
                ? (
                    (correctAnswers / totalQuestions) * 100
                ).toFixed(2) 
                : "0.00"
            const rank = leaderboardEntry 
                ? leaderboardEntry.rank 
                : "NA"

            return {
                roomName: room.roomName,
                totalQuestions,
                attemptedQuestions,
                correctAnswers,
                scorePercentage,
                rank,
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
        const { roomCode, roomId } = req.body

        if (!roomCode || !roomId) {
            return res.status(400).json({ 
                message: "Room Name and Room Code are required" 
            })
        }

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode },
        })

        if (!room || room.roomCode !== roomCode) {
            return res.status(400).json({ 
                message: "Invalid Room Name or Room Code" 
            })
        }

        res.status(200).json({ 
            message: "Room Code is valid" 
        })
    } catch (err) {
        console.error("Error verifying room code:", err)
        res.status(500).json({ 
            message: "Internal Server Error" 
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

        const detailedRooms = scheduledRooms.map((room) => ({
            id: room.id,
            roomName: room.roomName,
            totalQuestions: room.testModule.questions.length,
        }))

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
                endTime: room.endTime,
            },
        })

        await prisma.scheduledRoom.delete({ 
            where: { id: roomId } 
        })

        res.status(200).json({ 
            message: "Room activated successfully", activeRoom: newActiveRoom 
        })
    } catch (err) {
        console.error("Error activating scheduled room:", err)
        res.status(500).json({ message: "Internal Server Error" })
    }
}

const getPastRoomForInstructors = async (req, res) => {
    try {
        const pastRooms = await prisma.pastRoom.findMany({
            include: { 
                testModule: { 
                    include: { 
                        questions: true 
                    } 
                } 
            }
        })

        const quizAttempts = await prisma.quizAttempt.findMany()

        const detailedRooms = pastRooms.map((room) => {
            const roomAttempts = quizAttempts.filter(
                (attempt) => attempt.roomName === room.roomName
            )

            const scores = roomAttempts.map((attempt) => attempt.score)

            const totalScores = scores.reduce((acc, score) => acc + score, 0)
            const meanScore = scores.length > 0 ? (totalScores / scores.length).toFixed(2) : "N/A"
            const maxScore = scores.length > 0 ? Math.max(...scores) : "N/A"
            const minScore = scores.length > 0 ? Math.min(...scores) : "N/A"

            return {
                roomName: room.roomName,
                moduleName: room.testModule.name,
                totalQuestions: room.testModule.questions.length,
                meanScore,
                maxScore,
                minScore,
            }
        })

        res.status(200).json({ 
            pastRooms: detailedRooms 
        })
    } catch (err) {
        console.error("Error fetching past rooms for instructors:", err)
        res.status(500).json({ 
            message: "Internal Server Error" 
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
    getPastRoomForInstructors,
}