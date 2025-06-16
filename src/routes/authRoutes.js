const express = require("express")
const { login, register, getProfile, forgotPassword, resetPassword } = require("../controllers/authController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// Public routes
router.post("/login", login)
router.post("/register", register)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// Protected routes
router.get("/profile", authenticateToken, getProfile)

module.exports = router
