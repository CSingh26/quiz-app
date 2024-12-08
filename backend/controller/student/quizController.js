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
        const { roomCode, studentID, answers } = req.body

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode }
        })
        if (!room) {
            res.status(404).json({
                message: "Room not found or invactive"
            })
        }

        const student = await prisma.student.findUnique({
            where: { id: studentID }
        })
        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            })
        }

        let score = 0
        for (const answer of answers) {
            const question = await prisma.question.findUnique({
                where: { id: answer.questionId},
                include: { options: true }
            })

            if (question.correct === answer.selectedOption) {
                score += 1
            }
        }

        const quizAttempt = await prisma.quizAttempt.create({
            data: {
                studentID,
                answers,
                score,
                finishedAt: new Date()
            }
        })

        const leaderboardEntry = await prisma.leaderbaord.upsert({
            where: {
                studentId_roomId: {
                    studentID, 
                    roomId: room.id
                }
            },
            update: { score },
            create: {
                studentID,
                roomId: room.id,
                score,
                rank: 0
            }
        })

        res.status(200).json({
            message: "Quiz submitted successfully",
            score
        })
    } catch (err) {
        console.error("Error submitting quiz:", err)
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const getLeaderboard = async (req, res) => {
    try {
        const { roomCode } = req.params

        const room = await prisma.activeRoom.findUnique({
            where: { roomCode },
            include: {
                leaderboard: {
                    include: {
                        student: true
                    }
                }
            }
        })

        if (!room) {
            return res.status(404).json({
                message: "Room not found or inactive"
            })
        }

        const leaderbaord = room.leaderboard
            .sort((a, b) => b.score - a.score)
            .map((entry, index) => ({
                rank: index + 1,
                studentName: entry.student.name,
                score: entry.score
            }))

            res.status(200).json({
                leaderbaord
            })
    } catch (err) {
        console.error("Error fetching leaderbaord:", err)
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