const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const getQuizQuestions = async (req, res) => {
    try {
        const { roomCode } = req.params

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode },
            include: {
                testModule: {
                    include: {
                        questions: {
                            include: {
                                options: true
                            }
                        }
                    }
                }
            }
        })

        if (!room) {
            return res.status(404).json({
                message: "Room not found"
            })
        }

        const questions = room.testModule.questions.map(question => {
            const shuffledOptions = question.options.sort(() => Math.random() - 0.5)
            return {
                id: question.id,
                text: question.text,
                options: shuffledOptions.map((option, index) => ({
                    label: String.fromCharCode(97 + index),
                    text: option.text,
                    id: option.id
                }))
            }
        }).sort(() => Math.random() - 0.5)

        res.status(200).json({
            questions
        })
    } catch (err) {
        console.error("Error fetching quiz questions", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const submitQuiz = async (req, res) => {
    try {
        const { answers, roomCode } = req.body

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode },
        })
        if (!room) {
            return res.status(404).json({
                message: "Room not found or inactive",
            })
        }

        const studentID = req.user.id
        const student = await prisma.student.findUnique({
            where: { id: studentID },
        })
        if (!student) {
            return res.status(404).json({
                message: "Student not found",
            })
        }

        let score = 0
        for (const [questionId, selectedOption] of Object.entries(answers)) {
            const question = await prisma.question.findUnique({
                where: { id: questionId },
                include: { options: true },
            })

            if (question && question.correct === selectedOption) {
                score += 1 
            }
        }

        await prisma.quizAttempt.create({
            data: {
                studentId: studentID,
                roomName: room.roomName,
                answers, 
                score,
                finishedAt: new Date(),
            },
        })

        await prisma.leaderbaord.upsert({
            where: {
                studentId_roomName: {
                    studentId: studentID,
                    roomName: room.roomName,
                },
            },
            update: { score },
            create: {
                studentId: studentID,
                roomName: room.roomName,
                score,
                rank: 0, 
            },
        })

        res.status(200).json({
            message: "Quiz submitted successfully",
            score,
        })
    } catch (err) {
        console.error("Error submitting quiz:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

const getLeaderboard = async (req, res) => {
    try {
        const { roomCode } = req.params

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode },
        })

        if (!room) {
            return res.status(404).json({
                message: "Room not found or inactive"
            })
        }

        const leaderboardEntries = await prisma.leaderbaord.findMany({
            where: { roomName: room.roomName },
            include: {
                student: true
            }
        })

        const leaderboard = leaderboardEntries
            .sort((a, b) => b.score - a.score)
            .map((entry, index) => {
                return {
                    rank: index + 1,
                    studentName: entry.student.name,
                    score: entry.score
                }
            })

        res.status(200).json({ leaderboard })
    } catch (err) {
        console.error("Error fetching leaderboard:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

module.exports = {
    getQuizQuestions,
    submitQuiz,
    getLeaderboard
}