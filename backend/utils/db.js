const { PrismaClient} = require("@prisma/client")

require('dotenv').config({
    // path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
}) //configure your env and enter approraite path

const prisma = new PrismaClient()

const connectDB = async () => {
    try {
        const conn = prisma.$connect()
        console.log('MongoDB connected through Prisma')

        return { conn }
    } catch (err) {
        console.error(err.message)
        process.exit(1)
    }
}

module.exports = connectDB