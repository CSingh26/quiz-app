const { PrismaClient } = require("@prisma/client")

const { validateQuestionFile, QuizInputError } = require("../../domain/quiz")

function createQuestionController(prisma) {

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
        if (err instanceof QuizInputError) return res.status(400).json({ message: err.message })
            return res.status(400).json({ message: "Invalid JSON file" })
        }

        validateQuestionFile(questionData)

        let testModule = await prisma.testModule.findUnique({
            where: { name: testModuleName },
        })

        if (testModule) {
            return res.status(400).json({
                message: `Module with name "${testModuleName}" already exists`,
            })
        }

        // Prisma nested writes commit the module, questions and options atomically.
        await prisma.testModule.create({
            data: {
                name: testModuleName,
                questions: {
                    create: questionData.map(item => ({
                        text: item.question,
                        correct: item.answer,
                        options: { create: item.options.map(text => ({ text })) },
                    })),
                },
            },
        })

        res.status(200).json({
            message: "Test module uploaded successfully!",
        })
    } catch (err) {
        if (err instanceof QuizInputError) return res.status(400).json({ message: err.message })
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
        if (err instanceof QuizInputError) return res.status(400).json({ message: err.message })
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
        if (err instanceof QuizInputError) return res.status(400).json({ message: err.message })
        console.error("Error deleting test module:", err)
        res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

return { uploadQuestions, getTestModules, deleteTestModule }
}
module.exports = { ...createQuestionController(new PrismaClient()), createQuestionController }
