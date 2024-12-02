const enc = require('bcryptjs')
const jwt = require('jsonwebtoken')
const  { PrismaClient } = require("@prisma/client")

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path


//signup
const JWT_SEC = process.env.JWT_KEY
const prisma = new PrismaClient()

const signup = async (req, res) => {
    const { username, name, password } = req.body

    try {
        const existingStudent = await prisma.student.findUnique({
            where: { username }
        })

        if (existingStudent) {
            return res.status(400).json({
                message: "Username alreaady in use!"
            })
        }

        const encPwd = await enc.hash(password, 10)
        
        const newStudent = await prisma.student.create({
            data: {
                username,
                name,
                password: encPwd
            }
        })

        res.status(201).json({
            message: "Signup Successfull!"
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: "Internal Server Error!"
        })
    }
}

//login
const login = async (req, res) => {
    const { username, password} = req.body

    try {
        const student = await prisma.student.findUnique({
            where: { username }
        })

        if (!student) {
            return res.status(400).json({
                message: "Invalid Username or Password"
            })
        }

        const isMatch = enc.compare(password, student.password)
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid Username or Password"
            })
        }

        const token = jwt.sign({
            id: student.id
        }, JWT_SEC, {
            expiresIn: '1h'
        })

        res.status(200).json({
            message: "Login Successfull!",
            token
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: "Internal Server Error!"
        })
    }
}

module.exports = {signup, login}