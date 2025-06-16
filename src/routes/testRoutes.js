const express = require("express")
const { sendEmail } = require("../utils/emailService")
const { sendSMS } = require("../utils/smsService")
const { authenticateToken, isAdmin } = require("../middlewares/authMiddleware")
const { generateResponse } = require("../utils/responseHelper")

const router = express.Router()

// Protect all routes
router.use(authenticateToken)
router.use(isAdmin)

// Test email route
router.post("/email", async (req, res) => {
  try {
    const { to, subject, message, html } = req.body

    if (!to || !subject || !message) {
      return res.status(400).json(generateResponse(false, "Email, subject, and message are required"))
    }

    const result = await sendEmail(to, subject, message, html)

    if (result.success) {
      res.status(200).json(generateResponse(true, "Test email sent successfully", result))
    } else {
      res.status(500).json(generateResponse(false, "Failed to send test email", result.error))
    }
  } catch (error) {
    console.error("Test email error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
})

// Test SMS route
router.post("/sms", async (req, res) => {
  try {
    const { to, message } = req.body

    if (!to || !message) {
      return res.status(400).json(generateResponse(false, "Phone number and message are required"))
    }

    const result = await sendSMS(to, message)

    if (result.success) {
      res.status(200).json(generateResponse(true, "Test SMS sent successfully", result))
    } else {
      res.status(500).json(generateResponse(false, "Failed to send test SMS", result.error))
    }
  } catch (error) {
    console.error("Test SMS error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
})

module.exports = router
