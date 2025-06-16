const { generateResponse } = require("../utils/responseHelper")
const { Chat, Employee, User, ChatSettings } = require("../models")
const { createNotification } = require("./notificationController")

/**
 * Get admin chats with enhanced features
 */
const getAdminChats = async (req, res) => {
  try {
    const { userId } = req.user
    const { page = 1, limit = 20, search } = req.query

    // Find admin user
    const adminUser = await User.findById(userId)
    if (!adminUser) {
      return res.status(404).json(generateResponse(false, "Admin user not found"))
    }

    // Find associated employee record
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })
    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Build query for chats
    const query = {
      participants: adminEmployee._id,
      isActive: true,
    }

    // Add search functionality
    if (search) {
      const searchEmployees = await Employee.find({
        $or: [
          { "user.name": new RegExp(search, "i") },
          { "user.email": new RegExp(search, "i") },
          { employeeId: new RegExp(search, "i") },
        ],
      }).populate("user")

      const employeeIds = searchEmployees.map((emp) => emp._id)
      query.participants = { $in: [adminEmployee._id, ...employeeIds] }
    }

    // Get chats with pagination
    const chats = await Chat.find(query)
      .populate({
        path: "participants",
        populate: {
          path: "user",
          select: "name email profilePicture",
        },
      })
      .sort({ lastActivity: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    // Get chat settings for each chat
    const chatIds = chats.map((chat) => chat._id)
    const chatSettings = await ChatSettings.find({
      userId: adminEmployee._id,
      chatId: { $in: chatIds },
    })

    const settingsMap = {}
    chatSettings.forEach((setting) => {
      settingsMap[setting.chatId.toString()] = setting
    })

    // Format chats for frontend
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find((p) => p._id.toString() !== adminEmployee._id.toString())
      const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null
      const settings = settingsMap[chat._id.toString()]

      return {
        id: chat._id,
        chatType: chat.chatType,
        participant: {
          id: otherParticipant._id,
          name: otherParticipant.user.name,
          email: otherParticipant.user.email,
          profilePicture: otherParticipant.user.profilePicture,
          employeeId: otherParticipant.employeeId,
          department: otherParticipant.department,
          isOnline: otherParticipant.isOnline || false,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.createdAt,
              isRead: lastMessage.isRead,
              senderId: lastMessage.senderId,
              messageType: lastMessage.messageType,
            }
          : null,
        lastActivity: chat.lastActivity,
        unreadCount: chat.messages.filter(
          (msg) => !msg.isRead && msg.senderId.toString() !== adminEmployee._id.toString(),
        ).length,
        isMuted: settings?.isMuted || false,
        isBlocked: settings?.isBlocked || false,
        isPinned: settings?.isPinned || false,
      }
    })

    const totalChats = await Chat.countDocuments(query)

    const response = {
      chats: formattedChats,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalChats / limit),
        totalChats,
        hasNext: page * limit < totalChats,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Admin chats retrieved successfully", response))
  } catch (error) {
    console.error("Get admin chats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update chat settings (mute, block, pin, etc.)
 */
const updateChatSettings = async (req, res) => {
  try {
    const { chatId } = req.params
    const { userId } = req.user
    const { isMuted, isBlocked, isPinned, mutedUntil } = req.body

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Verify chat exists and admin is participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: adminEmployee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Find or create chat settings
    let chatSettings = await ChatSettings.findOne({
      userId: adminEmployee._id,
      chatId,
    })

    if (!chatSettings) {
      chatSettings = new ChatSettings({
        userId: adminEmployee._id,
        chatId,
      })
    }

    // Update settings
    if (isMuted !== undefined) {
      chatSettings.isMuted = isMuted
      if (isMuted && mutedUntil) {
        chatSettings.mutedUntil = new Date(mutedUntil)
      }
    }

    if (isBlocked !== undefined) {
      chatSettings.isBlocked = isBlocked
      if (isBlocked) {
        chatSettings.blockedAt = new Date()
      }
    }

    if (isPinned !== undefined) {
      chatSettings.isPinned = isPinned
      if (isPinned) {
        chatSettings.pinnedAt = new Date()
      }
    }

    await chatSettings.save()

    res.status(200).json(generateResponse(true, "Chat settings updated successfully", chatSettings))
  } catch (error) {
    console.error("Update chat settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Delete chat with confirmation
 */
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params
    const { userId } = req.user
    const { confirmDelete = false } = req.body

    if (!confirmDelete) {
      return res.status(400).json(generateResponse(false, "Delete confirmation required"))
    }

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Find chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: adminEmployee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Mark chat as inactive instead of deleting
    chat.isActive = false
    chat.deletedBy = adminEmployee._id
    chat.deletedAt = new Date()
    await chat.save()

    // Also delete chat settings
    await ChatSettings.findOneAndDelete({
      userId: adminEmployee._id,
      chatId,
    })

    res.status(200).json(generateResponse(true, "Chat deleted successfully"))
  } catch (error) {
    console.error("Delete chat error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Mark chat as unread
 */
const markChatAsUnread = async (req, res) => {
  try {
    const { chatId } = req.params
    const { userId } = req.user

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Find chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: adminEmployee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Mark all messages from other participants as unread
    chat.messages.forEach((message) => {
      if (message.senderId.toString() !== adminEmployee._id.toString()) {
        message.isRead = false
        message.readAt = null
      }
    })

    await chat.save()

    res.status(200).json(generateResponse(true, "Chat marked as unread"))
  } catch (error) {
    console.error("Mark chat as unread error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get chat statistics for admin
 */
const getChatStatistics = async (req, res) => {
  try {
    const { userId } = req.user

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Get chat statistics
    const totalChats = await Chat.countDocuments({
      participants: adminEmployee._id,
      isActive: true,
    })

    const unreadChats = await Chat.countDocuments({
      participants: adminEmployee._id,
      isActive: true,
      "messages.isRead": false,
      "messages.senderId": { $ne: adminEmployee._id },
    })

    const mutedChats = await ChatSettings.countDocuments({
      userId: adminEmployee._id,
      isMuted: true,
    })

    const blockedChats = await ChatSettings.countDocuments({
      userId: adminEmployee._id,
      isBlocked: true,
    })

    const stats = {
      totalChats,
      unreadChats,
      mutedChats,
      blockedChats,
      activeChats: totalChats - blockedChats,
    }

    res.status(200).json(generateResponse(true, "Chat statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get chat statistics error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAdminChats,
  updateChatSettings,
  deleteChat,
  markChatAsUnread,
  getChatStatistics,
}
