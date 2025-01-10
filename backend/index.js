const express = require('express')
const conn = require('./utils/db')
const bodyParser = require('body-parser')
const cors = require('cors')
const cookie = require('cookie-parser')

const insRoutes = require('./routes/instructor/authRoutesInstructor')
const stuRoutes = require('./routes/student/authRoutesStudent')
const testRoutes = require('./routes/instructor/testRoutes')
const roomRoutes = require('./routes/instructor/roomRoutes')
const quizRoutes = require("./routes/student/quizRoutes")
const profileRoutes = require("./routes/student/profileRoutes")
const authRoutes = require("./routes/authRoutes")

const roomTransfer = require("./routes/instructor/roomTransfer")

require('dotenv').config({
}) //configure your env and enter approraite path

const app = express()

const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.29.7:3000',
    'https://quizbee.tech',
    'https://www.quizbee.tech',
    'https://api.quizbee.tech'
]

app.use(cors({
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(bodyParser.json())
app.use(cookie())

roomTransfer()

app.use('/api/auth', authRoutes)
app.use('/api/auth/ins', insRoutes)
app.use('/api/auth/student', stuRoutes)
app.use("/api/tests", testRoutes)
app.use("/api/room", roomRoutes)
app.use("/api/quiz", quizRoutes)
app.use("/api/student/profile", profileRoutes)

const PORT = process.env.PORT || 3876

conn().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on ${PORT}`)
    })
}).catch(err => {
    console.error("Failed to connect to MongoDB", err)
})
