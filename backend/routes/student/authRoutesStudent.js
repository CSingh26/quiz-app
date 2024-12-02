const express = require('express')
const authController = require('../../controller/student/studentAuthController')

const router = express.Router()

//signup
router.post("/signup", authController.signup)

//login
router.post("/login", authController.login)

module.exports = router