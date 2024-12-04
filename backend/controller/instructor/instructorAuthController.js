const enc = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

//login
const login = async (req, res) => {
    const { username, password } = req.body
    
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

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        maxAge: 3600000,
        path: "/"
    })

    res.status(200).json({
        message: "Login Successfull",
    })
}

module.exports = login