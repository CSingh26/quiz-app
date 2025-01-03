const express = require('express')
const authController = require('../../controller/student/studentAuthController')
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

//signup
router.post("/signup", authController.signup)

//login
router.post("/login", authController.login)

//logout
router.post("/logout", authController.logout)

//check
router.get("/check", authenticationToken, (req, res) => {
    if (req.user.role !== "student") {
        return res.status(403).json({
            message: "Access denied. Not an student"
        })
    }

    res.status(200).json({
        role: "student",
        message: "Student authenticated"
    })
})

module.exports = router