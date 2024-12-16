const express = require("express")
const profileController = require("../../controller/student/profileController")
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

router.get("/get-profile",
    authenticationToken,
    profileController.fetchProfile
)

router.put("/update-profile",
    authenticationToken,
    profileController.updateProfile
)

module.exports = router