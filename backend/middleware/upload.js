const AWS = require("aws-sdk")
const multer = require("multer")
const multers3 = require("multer-s3")

require('dotenv').config({
    path: '/Users/chaitanyasingh/Documents/Project/quiz-app/backend/.env'
})

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
})

const upload = multer({
    storage: multers3({
        s3:s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: "public-read",
        metadata: (req, file, cb) => {
            cb(null, {
                feildName: feildname
            })
        },
        key: (req, file, cb) => {
            const fileName = `${Date.now()}-${file.originalname}`
            cb(null, fileName)
        }
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true)
        } else {
            cb(new Error("Only image files are allowed"), false)
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
})

module.exports = upload