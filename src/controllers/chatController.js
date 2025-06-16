const { generateResponse } = require("../utils/responseHelper")
const { Chat, Employee, ChatSettings } = require("../models")

const getMyChats = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { page = 1, limit = 20 } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Get chats where user is a participant
    const chats = await Chat.find({
      participants: employee._id,
      isActive: true,
    })
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
      userId: employee._id,
      chatId: { $in: chatIds },
    })

    const settingsMap = {}
    chatSettings.forEach((setting) => {
      settingsMap[setting.chatId.toString()] = setting
    })

    // Format chats for frontend
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find((p) => p._id.toString() !== employee._id.toString())
      const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null
      const settings = settingsMap[chat._id.toString()]

      return {
        id: chat._id,
        chatType: chat.chatType,
        participant: otherParticipant,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.createdAt,
              isRead: lastMessage.isRead,
              senderId: lastMessage.senderId,
            }
          : null,
        lastActivity: chat.lastActivity,
        unreadCount: chat.messages.filter((msg) => !msg.isRead && msg.senderId.toString() !== employee._id.toString())
          .length,
        isMuted: settings?.isMuted || false,
        isBlocked: settings?.isBlocked || false,
      }
    })

    res.status(200).json(generateResponse(true, "Chats retrieved successfully", formattedChats))
  } catch (error) {
    console.error("Get chats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params
    const { employeeId } = req.user
    const { page = 1, limit = 50 } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: employee._id,
    }).populate({
      path: "messages.senderId",
      populate: {
        path: "user",
        select: "name profilePicture",
      },
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Get paginated messages
    const totalMessages = chat.messages.length
    const startIndex = Math.max(0, totalMessages - page * limit)
    const endIndex = totalMessages - (page - 1) * limit
    const messages = chat.messages.slice(startIndex, endIndex)

    // Mark messages as read
    chat.messages.forEach((message) => {
      if (message.senderId.toString() !== employee._id.toString() && !message.isRead) {
        message.isRead = true
        message.readAt = new Date()
      }
    })
    await chat.save()

    const response = {
      chatId: chat._id,
      messages: messages.reverse(), // Reverse to show newest first
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasNext: startIndex > 0,
        hasPrev: endIndex < totalMessages,
      },
    }

    res.status(200).json(generateResponse(true, "Messages retrieved successfully", response))
  } catch (error) {
    console.error("Get messages error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params
    const { employeeId } = req.user
    const { content, messageType = "text" } = req.body

    if (!content) {
      return res.status(400).json(generateResponse(false, "Message content is required"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: employee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Add new message
    const newMessage = {
      senderId: employee._id,
      content,
      messageType,
      createdAt: new Date(),
    }

    chat.messages.push(newMessage)
    chat.lastActivity = new Date()
    await chat.save()

    // Populate sender info for response
    await chat.populate({
      path: "messages.senderId",
      populate: {
        path: "user",
        select: "name profilePicture",
      },
    })

    const savedMessage = chat.messages[chat.messages.length - 1]

    res.status(201).json(generateResponse(true, "Message sent successfully", savedMessage))
  } catch (error) {
    console.error("Send message error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: employee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Find and remove the message
    const messageIndex = chat.messages.findIndex(
      (msg) => msg._id.toString() === messageId && msg.senderId.toString() === employee._id.toString(),
    )

    if (messageIndex === -1) {
      return res.status(404).json(generateResponse(false, "Message not found or unauthorized"))
    }

    chat.messages.splice(messageIndex, 1)
    await chat.save()

    res.status(200).json(generateResponse(true, "Message deleted successfully"))
  } catch (error) {
    console.error("Delete message error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const markMessageAsUnread = async (req, res) => {
  try {
    const { chatId, messageId } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: employee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Find and mark message as unread
    const message = chat.messages.find((msg) => msg._id.toString() === messageId)

    if (!message) {
      return res.status(404).json(generateResponse(false, "Message not found"))
    }

    message.isRead = false
    message.readAt = null
    await chat.save()

    res.status(200).json(generateResponse(true, "Message marked as unread"))
  } catch (error) {
    console.error("Mark message as unread error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateChatSettings = async (req, res) => {
  try {
    const { chatId } = req.params
    const { employeeId } = req.user
    const { isMuted, isBlocked, mutedUntil } = req.body

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Find or create chat settings
    let chatSettings = await ChatSettings.findOne({
      userId: employee._id,
      chatId,
    })

    if (!chatSettings) {
      chatSettings = new ChatSettings({
        userId: employee._id,
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

    await chatSettings.save()

    res.status(200).json(generateResponse(true, "Chat settings updated successfully", chatSettings))
  } catch (error) {
    console.error("Update chat settings error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const chat = await Chat.findOne({
      _id: chatId,
      participants: employee._id,
    })

    if (!chat) {
      return res.status(404).json(generateResponse(false, "Chat not found"))
    }

    // Mark chat as inactive instead of deleting
    chat.isActive = false
    await chat.save()

    // Also delete chat settings
    await ChatSettings.findOneAndDelete({
      userId: employee._id,
      chatId,
    })

    res.status(200).json(generateResponse(true, "Chat deleted successfully"))
  } catch (error) {
    console.error("Delete chat error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const createOrGetChat = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { participantEmployeeId } = req.body

    if (!participantEmployeeId) {
      return res.status(400).json(generateResponse(false, "Participant employee ID is required"))
    }

    // Find both employees
    const [currentEmployee, participantEmployee] = await Promise.all([
      Employee.findOne({ employeeId, isActive: true }),
      Employee.findOne({ employeeId: participantEmployeeId, isActive: true }),
    ])

    if (!currentEmployee || !participantEmployee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [currentEmployee._id, participantEmployee._id] },
      chatType: "direct",
    }).populate({
      path: "participants",
      populate: {
        path: "user",
        select: "name email profilePicture",
      },
    })

    // Create new chat if doesn't exist
    if (!chat) {
      chat = new Chat({
        participants: [currentEmployee._id, participantEmployee._id],
        chatType: "direct",
      })
      await chat.save()
      await chat.populate({
        path: "participants",
        populate: {
          path: "user",
          select: "name email profilePicture",
        },
      })
    }

    res.status(200).json(generateResponse(true, "Chat retrieved successfully", chat))
  } catch (error) {
    console.error("Create/get chat error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getMyChats,
  getChatMessages,
  sendMessage,
  deleteMessage,
  markMessageAsUnread,
  updateChatSettings,
  deleteChat,
  createOrGetChat,
}
