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

const roomTransfer = require("./routes/instructor/roomTransfer")

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

const app = express()

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))
app.use(bodyParser.json())
app.use(cookie())

roomTransfer()

app.use('/api/auth/ins', insRoutes)
app.use('/api/auth/student', stuRoutes)
app.use("/api/tests", testRoutes)
app.use("/api/room", roomRoutes)
app.use("api/quiz", quizRoutes)

const PORT = process.env.PORT || 3876

conn().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on ${PORT}`)
    })
}).catch(err => {
    console.error("Failed to connect to MongoDB", err)
})
