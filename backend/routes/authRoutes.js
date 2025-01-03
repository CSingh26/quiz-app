const express = require('express')
const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')

router.get('/check', authMiddleware, (req, res) => {
    try {
        const user = req.user

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        return res.status(200).json({
            role: user.role
        })
    } catch (err) {
        console.error("Error checking auth: ", err)
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

router.post('/logout', authMiddleware, (req, res) => {
    try {
        res.clearCookie('token')
        return res.status(200).json({
            message: "Logged out successfully"
        })
    } catch (err) {
        console.error("Error logging out: ", err)
        return res.status(500).json({
            message: "Internal Server Error"
        })
        
    }
})

module.exports = router