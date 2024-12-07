const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const createRoom = async (req, res) => {
    try {
        const { roomName, testModuleName, startTime, endTime, expiryDate } = req.body

        if (!roomName || !testModuleName || !startTime || !endTime || !expiryDate) {
            return res.status(400).json({
                message: "All fields are required"
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

        const roomCode = Math.random.toString(36).substring(2, 8).toUpperCase()

        const newRoom = await prisma.activeRoom.create({
            data: {
                roomName,
                roomCode,
                testModuleId: testModule.id,
                startTime: new Date(`${expiryDate}T${startTime}`),
                endTime: new Date(`${expiryDate}T${endTime}`)
            }
        })

        res.status(201).json({
            message: "Room created successfully",
            roomCode
        })
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

        const expiredRooms = await prisma.activeRoom.findMany({
            where: {
                endTime: { lte: now} 
            }
        })

        for (const room of expiredRooms) {
            await prisma.pastRoom.create({
                data: {
                    roomName: room.roomName,
                    roomCode: room.roomCode,
                    testModuleId: room.testModuleId,
                    startTime: room.startTime,
                    endTime: room.endTime
                }
            })

            await prisma.activeRoom.delete({
                where: { id: room.id }
            })
        }

        console.log(`Transferred ${expiredRooms.length} expiry rooms`)
    } catch (err) {
        console.log("Error transferring expired rooms:", err)
    }
}

module.exports = { createRoom, transferExpiredRooms}