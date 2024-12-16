const enc = require('bcryptjs')
const jwt = require('jsonwebtoken')
const  { PrismaClient } = require("@prisma/client")
const upload = require("../../middleware/upload")

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path


const JWT_SEC = process.env.JWT_KEY
const prisma = new PrismaClient()

//signup
const signup = async (req, res) => {
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "background",
            maxCount: 1
        }
    ])(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                message: "Image Upload Failed",
                error: err.message
            })
        }

        const { username, name, password } = req.body

        try {
            const existingStudent = await prisma.student.findUnique({
                where: { username }
            })

            if (existingStudent) {
                return res.status(400).json({
                    message: "Username already in use!"
                })
            }

            const encPwd = await enc.hash(password, 10)

            const avatarUrl = req.files?.avatar?.[0]?.location || process.env.DEFAULT_AVATAR_URL
            const backgroundUrl = req.files?.background?.[0]?.location || process.env.DEFAULT_BACKGROUND_URL

            const newStudent = await prisma.student.create({
                data: {
                    username,
                    name,
                    password: encPwd,
                    avatar: avatarUrl,
                    background: backgroundUrl
                }
            })

            res.status(201).json({
                message: "Signup Successful!"
            })
        } catch (err) {
            console.error(err)
            res.status(500).json({
                message: "Internal Server Error"
            })
        }

    })
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

        const isMatch = await enc.compare(password, student.password)
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid Username or Password"
            })
        }

        const token = jwt.sign({
            id: student.id,
            role: "student"
        }, JWT_SEC, {
            expiresIn: '1h'
        })

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600000,
        })

        res.status(200).json({
            message: "Login Successfull!",
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: "Internal Server Error!"
        })
    }
}

module.exports = {signup, login}