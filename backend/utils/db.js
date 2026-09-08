const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

// Readiness follows a completed connection; a pending promise is not a healthy DB.
const connectDB = async () => {
    await prisma.$connect();
    console.log('MongoDB connected through Prisma');
    return prisma;
};
module.exports = connectDB;
