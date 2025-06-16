const express = require("express")
const {
  getAdminNotifications,
  createSystemNotification,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/adminNotificationController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

// Notification management
router.get("/", getAdminNotifications)
router.post("/system", createSystemNotification)
router.put("/read-all", markAllAsRead)
router.delete("/:id", deleteNotification)

module.exports = router
