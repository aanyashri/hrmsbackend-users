const express = require("express")
const { adminLogin, getAdminProfile } = require("../controllers/adminAuthController")
const { authenticateToken, authorizeRoles } = require("../middlewares/authMiddleware")

const router = express.Router()

// Public routes
router.post("/login", adminLogin)

// Protected routes
router.get("/profile", authenticateToken, authorizeRoles("HR", "Admin", "Manager"), getAdminProfile)

module.exports = router
