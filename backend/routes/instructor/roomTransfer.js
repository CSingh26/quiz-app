const cron = require("node-cron")
const { transferExpiredRooms, activateScheuledRooms } = require("../../controller/instructor/roomController")

const scheduleRoomTransfer = () => {
    cron.schedule("* * * * *", async () => {
        console.log("Checking for expired rooms...")
        try {
            await activateScheuledRooms()

            await transferExpiredRooms()

            console.log("Room cheks and transfer completed.")
        } catch (err) {
            console.log("Error in room transfer cron job", err)
        }
    })
}

module.exports = scheduleRoomTransfer