const { PrismaClient} = require("@prisma/client")

require('dotenv').config({
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