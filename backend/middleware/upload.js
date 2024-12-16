const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid")

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
})

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
})

const s3Storage = multer.memoryStorage()

const upload = multer({
    storage: s3Storage
})

const uploadToS3 = async (file, folder) => {
    const fileName = `${folder}/${uuidv4()}-${file.originalname}`
    const params = {
        Bucker: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read"
    }

    try {
        const command = new PutObjectCommand(params)
        await s3Client.send(command)

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`
        return fileUrl
    } catch (err) {
        console.error("Error uploading to S3:", err)
        throw new Error("Failed to upload file to S3")
    }
}

module.exports = { upload, uploadToS3}