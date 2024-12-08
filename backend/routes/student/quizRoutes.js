const express = require("express")
const quizController = require("../../controller/student/quizController")

const router = express.Router()

router.get("/:roomCode/questions", quizController.getQuizQuestions)

router.post("/submit-quiz", quizController.getQuizQuestions)

router.get("/:roomCode/leaderboard", quizController.getLeaderboard)

module.exports = router