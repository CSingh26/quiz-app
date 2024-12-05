const express = require("express")
const roomController = require("../../controller/instructor/roomController")

const router = express.Router()

router.post("/create-room", roomController.createRoom)

module.exports = router