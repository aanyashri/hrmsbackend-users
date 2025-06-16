const express = require("express")
const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notificationController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getMyNotifications)
router.put("/:id/read", markNotificationAsRead)
router.put("/read-all", markAllNotificationsAsRead)
router.delete("/:id", deleteNotification)

module.exports = router
