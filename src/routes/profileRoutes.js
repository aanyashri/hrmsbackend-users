const express = require("express")
const {
  getMyProfile,
  updateProfile,
  changePassword,
  updateProfilePicture,
  getAccountSettings,
  updateAccountSettings,
} = require("../controllers/profileController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getMyProfile)
router.put("/", updateProfile)
router.put("/password", changePassword)
router.put("/picture", updateProfilePicture)
router.get("/settings", getAccountSettings)
router.put("/settings", updateAccountSettings)

module.exports = router
