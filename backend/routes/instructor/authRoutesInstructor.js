const express = require('express')
const authController = require('../../controller/instructor/instructorAuthController')
const authenticationToken = require("../../middleware/authMiddleware")

const router = express.Router()

require('dotenv').config({
}) //configure your env and enter approraite path

router.post('/login', 
    authController.login
)

router.post("/logout", 
    authController.logout
)

router.get("/check", 
    authenticationToken, 
    (req, res) => {
        if (req.user.role !== "instructor") {
            return res.status(403).json({
                message: "Access denied. Not an instructor"
            })
        }

        res.status(200).json({
            role: "instructor",
            message: "Instructor authenticated"
        })
    }
)

module.exports = router