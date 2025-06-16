const { generateResponse } = require("../utils/responseHelper")
const { Notification, Employee, User } = require("../models")
const moment = require("moment")
const { sendEmail } = require("../utils/emailService")
const { sendSMS } = require("../utils/smsService")

const getMyNotifications = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { category, isRead, type, page = 1, limit = 20 } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = { recipientId: employee._id }

    if (category) {
      query.category = category
    }

    if (isRead !== undefined) {
      query.isRead = isRead === "true"
    }

    if (type) {
      query.type = type
    }

    // Get total count
    const totalNotifications = await Notification.countDocuments(query)

    // Get paginated notifications
    const notifications = await Notification.find(query)
      .populate("sender")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    // Group notifications by category
    const groupedNotifications = {
      recent: [],
      earlier: [],
    }

    notifications.forEach((notification) => {
      const notificationData = {
        id: notification._id,
        notificationId: notification.notificationId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        isRead: notification.isRead,
        readAt: notification.readAt,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        createdAt: notification.createdAt,
        sender: notification.sender,
        timeAgo: moment(notification.createdAt).fromNow(),
        icon: getNotificationIcon(notification.type),
      }

      if (notification.category === "recent") {
        groupedNotifications.recent.push(notificationData)
      } else {
        groupedNotifications.earlier.push(notificationData)
      }
    })

    const response = {
      notifications: groupedNotifications,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNext: page * limit < totalNotifications,
        hasPrev: page > 1,
      },
      unreadCount: await Notification.countDocuments({
        recipientId: employee._id,
        isRead: false,
      }),
    }

    res.status(200).json(generateResponse(true, "Notifications retrieved successfully", response))
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientId: employee._id,
    })

    if (!notification) {
      return res.status(404).json(generateResponse(false, "Notification not found"))
    }

    notification.isRead = true
    notification.readAt = new Date()
    await notification.save()

    res.status(200).json(generateResponse(true, "Notification marked as read"))
  } catch (error) {
    console.error("Mark notification as read error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    await Notification.updateMany({ recipientId: employee._id, isRead: false }, { isRead: true, readAt: new Date() })

    res.status(200).json(generateResponse(true, "All notifications marked as read"))
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientId: employee._id,
    })

    if (!notification) {
      return res.status(404).json(generateResponse(false, "Notification not found"))
    }

    res.status(200).json(generateResponse(true, "Notification deleted successfully"))
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Create a notification and optionally send email/SMS
 * @param {ObjectId} recipientId - Employee ID of recipient
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options
 * @returns {Object} - Created notification
 */
const createNotification = async (recipientId, type, title, message, options = {}) => {
  try {
    const notification = new Notification({
      recipientId,
      senderId: options.senderId,
      type,
      title,
      message,
      priority: options.priority || "medium",
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      metadata: options.metadata,
      expiresAt: options.expiresAt,
    })

    await notification.save()

    // If email notification is enabled, send email
    if (options.sendEmail) {
      try {
        // Get recipient's email
        const employee = await Employee.findById(recipientId).populate("userId")
        if (employee && employee.userId && employee.userId.email) {
          await sendEmail(
            employee.userId.email,
            title,
            message,
            options.emailHtml || `<h2>${title}</h2><p>${message}</p>`,
          )
        }
      } catch (emailError) {
        console.error("Email notification error:", emailError)
      }
    }

    // If SMS notification is enabled, send SMS
    if (options.sendSMS) {
      try {
        // Get recipient's phone number
        const employee = await Employee.findById(recipientId).populate("userId")
        if (employee && employee.userId && employee.userId.phone) {
          await sendSMS(employee.userId.phone, `${title}: ${message}`)
        }
      } catch (smsError) {
        console.error("SMS notification error:", smsError)
      }
    }

    return notification
  } catch (error) {
    console.error("Create notification error:", error)
    throw error
  }
}

const getNotificationIcon = (type) => {
  const iconMap = {
    policy_update: "📋",
    shift_schedule: "📅",
    performance_review: "⭐",
    holiday_announcement: "🎉",
    leave_approval: "✅",
    leave_rejection: "❌",
    payroll_processed: "💰",
    attendance_reminder: "⏰",
    complaint_update: "📝",
    support_response: "💬",
    chat_message: "💬",
    call_missed: "📞",
    system_update: "🔧",
    birthday_reminder: "🎂",
    work_anniversary: "🎊",
    meeting_reminder: "📅",
    document_shared: "📄",
    task_assigned: "✅",
    deadline_reminder: "⚠️",
  }

  return iconMap[type] || "📢"
}

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
}
