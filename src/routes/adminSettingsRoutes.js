const express = require("express")
const {
  uploadProfilePicture,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAdminAccountSettings,
  updateAdminAccountSettings,
} = require("../controllers/adminSettingsController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

// Profile management
router.get("/profile", getAdminProfile)
router.put("/profile", uploadProfilePicture, updateAdminProfile)
router.put("/password", changeAdminPassword)

// Account settings
router.get("/account", getAdminAccountSettings)
router.put("/account", updateAdminAccountSettings)

module.exports = router
