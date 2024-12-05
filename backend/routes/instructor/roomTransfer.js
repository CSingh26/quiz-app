const cron = require("node-cron")
const { transferExpiredRooms } = require("../../controller/instructor/roomController")

cron.schedule("* * * * *", async () => {
    console.log("Checking for expired rooms")
    await transferExpiredRooms()
})