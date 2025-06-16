const express = require("express")
const {
  getMyChats,
  getChatMessages,
  sendMessage,
  deleteMessage,
  markMessageAsUnread,
  updateChatSettings,
  deleteChat,
  createOrGetChat,
} = require("../controllers/chatController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getMyChats)
router.post("/", createOrGetChat)
router.get("/:chatId/messages", getChatMessages)
router.post("/:chatId/messages", sendMessage)
router.delete("/:chatId/messages/:messageId", deleteMessage)
router.put("/:chatId/messages/:messageId/unread", markMessageAsUnread)
router.put("/:chatId/settings", updateChatSettings)
router.delete("/:chatId", deleteChat)

module.exports = router
