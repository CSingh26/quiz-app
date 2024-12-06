const cron = require("node-cron")
const { transferExpiredRooms } = require("../../controller/instructor/roomController")

const scheduleRoomTransfer = () => {
    cron.schedule("* * * * *", async () => {
        console.log("Checking for expired rooms...")
        await transferExpiredRooms()
    })
}

module.exports = scheduleRoomTransfer