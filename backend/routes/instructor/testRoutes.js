const express = require("express")
const multer = require("multer")
const testController = require("../../controller/instructor/questionUploadController")

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
})

router.post("/upload-test", 
    upload.single("testFile"),
    (req, res, next) => {
        try {
            const { testModuleName } = req.body
            console.log("Parsed Body:", req.body)
            if (!testModuleName) {
                return res.status(400).json({
                    message: "Test Module Name is required"
                })
            }
            next()
        } catch (err) {
            console.error("Error parsing from data:", err)
            return res.status(400).json({
                message: "Invalid from data"
            })
        }
    },
    testController.uploadQuestions
)

router.get("/get-modules", testController.getTestModules)

router.delete("/delete-module/:moduleId", testController.deleteTestModule)

module.exports = router