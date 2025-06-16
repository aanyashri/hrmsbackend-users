const express = require("express")
const {
  getAdminChats,
  updateChatSettings,
  deleteChat,
  markChatAsUnread,
  getChatStatistics,
} = require("../controllers/adminChatController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

// Chat management
router.get("/", getAdminChats)
router.get("/statistics", getChatStatistics)
router.put("/:chatId/settings", updateChatSettings)
router.put("/:chatId/unread", markChatAsUnread)
router.delete("/:chatId", deleteChat)

module.exports = router
