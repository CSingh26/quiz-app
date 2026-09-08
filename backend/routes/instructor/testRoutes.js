const express = require("express")
const multer = require("multer")
const testController = require("../../controller/instructor/questionUploadController")

const authenticate = require("../../middleware/authMiddleware")
const { requireRole } = authenticate

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

router.post(
    "/upload-test",
    authenticate, requireRole("instructor"),
    upload.single("testFile"), 
    (req, res, next) => {
        try {
            const { testModuleName } = req.body
            if (!testModuleName) {
                return res.status(400).json({
                    message: "Test Module Name is required",
                })
            }
            next()
        } catch (err) {
            console.error("Error parsing form data:", err)
            return res.status(400).json({
                message: "Invalid form data",
            })
        }
    },
    testController.uploadQuestions
)

router.get("/get-modules", 
    testController.getTestModules
)

router.delete("/delete-module/:moduleId",
    authenticate, requireRole("instructor"), 
    testController.deleteTestModule
)

module.exports = router