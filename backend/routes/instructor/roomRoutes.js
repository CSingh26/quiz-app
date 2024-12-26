const express = require("express")
const roomController = require("../../controller/instructor/roomController")
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

router.post("/create-room", roomController.createRoom)
router.get("/get-active-rooms", roomController.getActiveRooms)
router.get("/get-past-rooms", roomController.getPastRooms)
router.post("/verify-room-code", authenticationToken, roomController.verifyRoomCode)

module.exports = router