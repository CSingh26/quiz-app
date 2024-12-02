const express = require('express')
const authController = require('../../controller/instructor/instructorAuthController')

const router = express.Router()

router.post('/login', authController)

module.exports = router