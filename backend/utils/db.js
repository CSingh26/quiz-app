const mong = require('mongoose')

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

const connectDB = async () => {
    try {
        const conn = await mong.connect(process.env.MONGO_URL)
        console.log('MongoDB connected')

        return { conn }
    } catch (err) {
        console.error(err.message)
        process.exit(1)
    }
}

module.exports = connectDB