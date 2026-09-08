const sessionCookie = require("../../middleware/sessionCookie")
const enc = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config({
}) //configure your env and enter approraite path

//login
const login = async (req, res) => {
    const { username, password } = req.body || {}
    if (typeof username !== "string" || !username.trim() || username.length > 100
        || typeof password !== "string" || !password || password.length > 1024) {
        return res.status(400).json({ message: "Valid username and password are required" })
    }
    if (!process.env.ADMIN_USERNAME || !process.env.JWT_KEY
        || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(process.env.ADMIN_PWD || "")) {
        return res.status(503).json({ message: "Instructor authentication is not configured" })
    }
    
    if (username !== process.env.ADMIN_USERNAME) {
        return res.status(401).json({
            messsage: "Invalid Username"
        })
    }

    const isMatch = await enc.compare(password, process.env.ADMIN_PWD)
    if (!isMatch) {
        return res.status(401).json({
            messsage: "Incorrect Password!"
        })
    }

    const token = jwt.sign({
        username: process.env.ADMIN_USERNAME,
        role: "instructor"
    }, process.env.JWT_KEY, {
        expiresIn: '1h'
    })

    res.cookie("token", token, { ...sessionCookie(), maxAge: 3600000 })

    res.status(200).json({
        message: "Login Successfull",
    })
}

const logout = (req, res) => {
    res.cookie("token", "", { ...sessionCookie(), maxAge: 0 })

    res.status(200).json({
        message: "Logout Successfull"
    })
}

module.exports = {
    login,
    logout
}