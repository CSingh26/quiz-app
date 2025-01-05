const express = require("express")
const roomController = require("../../controller/instructor/roomController")
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

router.post(
    "/create-room", 
    roomController.createRoom
)

router.get(
    "/get-active-rooms", 
    roomController.getActiveRooms
)

router.get(
    "/get-past-rooms",
    authenticationToken,
     roomController.getPastRooms
)
router.post(
    "/verify-room-code", 
    authenticationToken, 
    roomController.verifyRoomCode
)

router.post(
    "/activate-room/:roomId",
    roomController.activateScheuledRoomNow
)

router.get(
    "/get-scheduled-rooms",
    roomController.getScheduleRooms
)

router.get(
    "/get-past-room-ins",
    roomController.getPastRoomForInstructors
)

module.exports = router