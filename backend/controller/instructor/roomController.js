const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const createRoom = async (req, res) => {
    try {
        const { roomName, roomCode, testModuleName, startTime, endTime, expiryDate } = req.body

        if (!roomName || !roomCode || !testModuleName || !startTime || !endTime || !expiryDate) {
            return res.status(400).json({
                message: "All fields are required"
            })
        }

        const existingActiveRoom = await prisma.activeRoom.findUnique({
            where: { roomCode },
        })

        const existingScheduledRoom = await prisma.scheduledRoom.findUnique({
            where: { roomCode },
        })

        const existingPastRoom = await prisma.pastRoom.findUnique({
            where: { roomCode },
        })

        if (existingActiveRoom || existingScheduledRoom || existingPastRoom) {
            return res.status(400).json({
                message: "Room code already exists. Please choose a different code.",
            })
        }

        const testModule = await prisma.testModule.findUnique({
            where: { name: testModuleName }
        })

        if (!testModule) {
            return res.status(404).json({
                message: "Test module not found"
            })
        }

        const parsedStartTime = new Date(`${expiryDate}T${startTime}`)
        const parsedEndTime = new Date(`${expiryDate}T${endTime}`)

        const roomData = {
            roomName,
            roomCode,
            testModule: {
                connect: {
                    id: testModule.id
                }
            },
            startTime: parsedStartTime,
            endTime: parsedEndTime
        }

        if (parsedStartTime > new Date()) {
            const futureRoom = await prisma.scheduledRoom.create({
                data: roomData
            })

            res.status(200).json({
                message: "Room scheduled Successfully",
                roomCode,
            })
        } else {
            const newRoom = await prisma.activeRoom.create({
                data: roomData
            })
    
            res.status(201).json({
                message: "Room created successfully",
                roomCode,
            })
        }
    } catch (err) {
        console.error("Error creating room:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const transferExpiredRooms = async () => {
    try {
        const now = new Date()

        // Find all expired rooms
        const expiredRooms = await prisma.activeRoom.findMany({
            where: {
                endTime: { lte: now },
            },
        })

        for (const room of expiredRooms) {
            // Retrieve or create the corresponding PastRoom
            let pastRoom = await prisma.pastRoom.findUnique({
                where: {
                    roomCode: room.roomCode,
                },
            })

            if (!pastRoom) {
                pastRoom = await prisma.pastRoom.create({
                    data: {
                        roomName: room.roomName,
                        roomCode: room.roomCode,
                        testModuleId: room.testModuleId,
                        startTime: room.startTime,
                        endTime: room.endTime,
                    },
                })
            }

            // Update leaderboard entries to reference the PastRoom's ID
            const leaderboardEntries = await prisma.leaderbaord.findMany({
                where: { roomId: room.id },
            })

            for (const entry of leaderboardEntries) {
                await prisma.leaderbaord.update({
                    where: { id: entry.id },
                    data: {
                        roomId: pastRoom.id, // Reference the PastRoom's ID
                    },
                })
            }

            // Delete the expired room from ActiveRoom
            await prisma.activeRoom.delete({
                where: { id: room.id },
            })
        }

        console.log(`Transferred ${expiredRooms.length} expired rooms`)
    } catch (err) {
        console.error("Error transferring expired rooms:", err)
    }
}

const activateScheuledRooms = async () => {
    try {
        const now = new Date()

        const roomsToActivate = await prisma.scheduledRoom.findMany({
            where: {
                startTime: { lte: now }
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
                testModule: true
            }
        })

        res.status(200).json({
            activeRooms
        })
    } catch (err) {
        console.error("Error fetching active rooms:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

module.exports = { 
    createRoom, 
    transferExpiredRooms, 
    activateScheuledRooms,
    getActiveRooms
}