const express = require('express')
const authController = require('../../controller/instructor/instructorAuthController')
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

router.post('/login', authController)

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
    })
    res.status(200).json({
        message: "Logout out successfully"
    })
})

router.get("/check", authenticationToken, (req, res) => {
    if (req.user.role !== "instructor") {
        return res.status(403).json({
            message: "Access denied. Not an instructor"
        })
    }

    res.status(200).json({
        role: "instructor",
        message: "Instructor authenticated"
    })
})

module.exports = router