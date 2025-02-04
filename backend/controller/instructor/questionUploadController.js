const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const uploadQuestions = async (req, res) => {
    try {
        if (!req.file || req.file.size === 0) {
            return res.status(400).json({ message: "No file uploaded or file is empty" })
        }

        const { testModuleName } = req.body
        if (!testModuleName) {
            return res.status(400).json({ message: "Test Module name is required" })
        }

        let questionData
        try {
            questionData = JSON.parse(req.file.buffer.toString())
        } catch (err) {
            return res.status(400).json({ message: "Invalid JSON file" })
        }

        if (!Array.isArray(questionData)) {
            return res.status(400).json({
                message: "Invalid JSON structure. Must be an array of questions",
            })
        }

        let testModule = await prisma.testModule.findUnique({
            where: { name: testModuleName },
        })

        if (testModule) {
            return res.status(400).json({
                message: `Module with name "${testModuleName}" already exists`,
            })
        }

        testModule = await prisma.testModule.create({
            data: { name: testModuleName },
        })

        for (const questionItem of questionData) {
            const { question, options, answer } = questionItem

            if (!question || !Array.isArray(options) || options.length < 2 || !answer) {
                return res.status(400).json({
                    message: "Each question must have 'question', 'options' (min 2), and 'answer' fields",
                })
            }

            if (!options.includes(answer)) {
                return res.status(400).json({
                    message: `Answer "${answer}" must be one of the provided options`,
                })
            }

            const newQuestion = await prisma.question.create({
                data: {
                    text: question,
                    correct: answer,
                    testModuleId: testModule.id,
                },
            })

            await prisma.option.createMany({
                data: options.map((optionText) => ({
                    text: optionText,
                    questionId: newQuestion.id,
                })),
            })
        }

        res.status(200).json({
            message: "Test module uploaded successfully!",
        })
    } catch (err) {
        console.error("Error uploading questions:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

const getTestModules = async (req, res) => {
    try {
        const testModules = await prisma.testModule.findMany({
            select: {
                name: true,
                id: true,
            },
        })

        if (testModules.length === 0) {
            return res.status(404).json({
                message: "No test modules found",
            })
        }

        res.status(200).json({
            modules: testModules,
        })
    } catch (err) {
        console.error("Error fetching test modules:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

const deleteTestModule = async (req, res) => {
    try {
        const { moduleId } = req.params

        if (!moduleId) {
            return res.status(400).json({
                message: "Module ID is required",
            })
        }

        const module = await prisma.testModule.findUnique({
            where: { id: moduleId },
        })

        if (!module) {
            return res.status(404).json({
                message: "Module not found",
            })
        }

        await prisma.option.deleteMany({
            where: { question: { testModuleId: moduleId } },
        })

        await prisma.question.deleteMany({
            where: { testModuleId: moduleId },
        })

        await prisma.testModule.delete({
            where: { id: moduleId },
        })

        res.status(200).json({
            message: "Module deleted successfully",
        })
    } catch (err) {
        console.error("Error deleting test module:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

module.exports = {
    uploadQuestions,
    getTestModules,
    deleteTestModule,
}