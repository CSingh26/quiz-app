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
                    testModuleId: room.testModuleID,
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

module.exports = { createRoom, transferExpiredRooms, activateScheuledRooms}