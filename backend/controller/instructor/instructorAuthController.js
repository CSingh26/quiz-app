const enc = require('bcryptjs')
const jwt = require('jsonwebtoken')

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

//login
const login = async (req, res) => {
    const { username, password } = req.body
    
    if (username !== INS_USERNAME) {
        return res.status(401).json({
            messsage: "Invalid Username"
        })
    }

    const isMatch = await enc.compare(password, INS_PWD)
    if (!isMatch) {
        return res.status(401).json({
            messsage: "Incorrect Password!"
        })
    }

    const token = jwt.sign({
        username: INS_USERNAME
    }, JWT_SEC, {
        expiresIn: '1h'
    })

    res.status(200).json({
        message: "Login Successfull",
        token: token
    })
}

module.exports = login