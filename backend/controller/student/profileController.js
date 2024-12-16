const { PrismaClient } = require("@prisma/client")
const upload = require("../../middleware/upload")

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
                name: student,
                username: student.username,
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
        const { name, username } = req.body

        try {
            const avatarUrl = req.files?.avatar?.[0]?.location
            const backgroundUrl = req.files?.background?.[0]?.location

            const updatedStudent = await prisma.student.update({
                where: {
                    id: studentId
                },
                data: {
                    name: name,
                    username: username,
                    avatar: avatarUrl,
                    background: backgroundUrl
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

module.exports = { fetchProfile, updateProfile}