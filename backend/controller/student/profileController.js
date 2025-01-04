const { PrismaClient } = require("@prisma/client")
const { upload, uploadToS3 } = require("../../middleware/upload")
const e = require("express")

const prisma = new PrismaClient()

//fetch-profile
const fetchProfile = async (req, res) => {
    const studentId = req.user.id 

    try {
        const student = await prisma.student.findUnique({
            where: {
                id: studentId
            },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatar: true,
                background: true
            }
        })

        if(!student) {
            res.status(404).json({
                message: "Student not found!"
            })
        }

        res.status(200).json({
            profile: {
                id: student.id,
                name: student.name,
                username: student.username,
                email: student.email,
                avatar: student.avatar,
                background: student.background,
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

//update-profile
const updateProfile = async (req, res) => {
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

        const studentId = req.user.id
        const { name, username, email } = req.body

        try {
            let avatarUrl
            let backgroundUrl

            if (req.files?.avatar) {
                avatarUrl = await uploadToS3(req.files.avatar[0], "avatars")
            }

            if (req.files?.background) {
                backgroundUrl = await uploadToS3(req.files.background[0], "backgrounds")
            }

            if (email) {
                const existingStudent = await prisma.student.findUnique({
                    where: {
                        email
                    }
                })

                if (existingStudent && existingStudent.id !== studentId) {
                    return res.status(400).json({
                        message: "Email is already in use by another account!"
                    })
                }
            }

            if (username) {
                const existingUsername = await prisma.student.findUnique({
                    where: {
                        username
                    }
                })

                if (existingUsername && existingUsername.id !== studentId) {
                    return res.status(400).json({
                        message: "Username is already in use by another account!"
                    })
                }
            }

            const updatedStudent = await prisma.student.update({
                where: {
                    id: studentId
                },
                data: {
                    name: name || undefined,
                    username: username || undefined,
                    avatar: avatarUrl || undefined,
                    background: backgroundUrl || undefined
                }
            })

            res.status(200).json({
                message: "Profile updated successfully",
                profile: {
                    id: updatedStudent.id,
                    name: updatedStudent.name,
                    username: updatedStudent.username,
                    avatar: updatedStudent.avatar,
                    background: updatedStudent.background
                }
            })
        } catch (err) {
            console.error(err)
            res.status(500).json({
                message: "Failed to update profile"
            })
        }
    })
}

module.exports = { 
    fetchProfile, 
    updateProfile
}