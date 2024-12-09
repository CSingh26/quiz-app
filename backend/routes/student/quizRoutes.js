const express = require("express")
const quizController = require("../../controller/student/quizController")
const authMiddlerware = require("../../middleware/authMiddleware")

const router = express.Router()

router.get("/:roomCode/get-questions", quizController.getQuizQuestions)

router.post("/submit-quiz", authMiddlerware, quizController.submitQuiz)

router.get("/:roomCode/leaderboard", quizController.getLeaderboard)

module.exports = router