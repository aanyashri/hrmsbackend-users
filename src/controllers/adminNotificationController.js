const { generateResponse } = require("../utils/responseHelper")
const { Notification, Employee, User } = require("../models")
const { createNotification } = require("./notificationController")
const { sendEmail, sendBulkEmails } = require("../utils/emailService")
const { sendSMS, sendBulkSMS } = require("../utils/smsService")
const moment = require("moment")

/**
 * Get admin notifications with enhanced filtering
 */
const getAdminNotifications = async (req, res) => {
  try {
    const { userId } = req.user
    const { category, isRead, type, priority, page = 1, limit = 20, dateFrom, dateTo } = req.query

    // Find admin user and employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Build query
    const query = { recipientId: adminEmployee._id }

    if (category) {
      query.category = category
    }

    if (isRead !== undefined) {
      query.isRead = isRead === "true"
    }

    if (type) {
      query.type = type
    }

    if (priority) {
      query.priority = priority
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo)
      }
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
        metadata: notification.metadata,
      }

      // Categorize by time (last 24 hours = recent)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (notification.createdAt > dayAgo) {
        groupedNotifications.recent.push(notificationData)
      } else {
        groupedNotifications.earlier.push(notificationData)
      }
    })

    // Get notification statistics
    const stats = await getNotificationStats(adminEmployee._id)

    const response = {
      notifications: groupedNotifications,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNext: page * limit < totalNotifications,
        hasPrev: page > 1,
      },
      statistics: stats,
    }

    res.status(200).json(generateResponse(true, "Admin notifications retrieved successfully", response))
  } catch (error) {
    console.error("Get admin notifications error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Create system notification for all employees with email and SMS options
 */
const createSystemNotification = async (req, res) => {
  try {
    const { userId } = req.user
    const {
      title,
      message,
      type,
      priority = "medium",
      actionUrl,
      actionText,
      targetEmployees,
      sendEmail = false,
      sendSMS = false,
      emailSubject,
      emailHtml,
    } = req.body

    if (!title || !message || !type) {
      return res.status(400).json(generateResponse(false, "Title, message, and type are required"))
    }

    // Find admin user
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Determine target employees
    let recipients = []
    if (targetEmployees && targetEmployees.length > 0) {
      // Send to specific employees
      recipients = await Employee.find({
        employeeId: { $in: targetEmployees },
        isActive: true,
      }).populate("userId")
    } else {
      // Send to all active employees
      recipients = await Employee.find({ isActive: true }).populate("userId")
    }

    // Create notifications for all recipients
    const notifications = []
    for (const recipient of recipients) {
      const notification = await createNotification(recipient._id, type, title, message, {
        senderId: adminEmployee._id,
        priority,
        actionUrl,
        actionText,
        metadata: {
          entityType: "system_announcement",
          entityId: adminEmployee._id,
          additionalData: {
            sentBy: adminUser.name,
            sentAt: new Date(),
          },
        },
      })
      notifications.push(notification)
    }

    // Send emails if requested
    if (sendEmail) {
      try {
        const emailRecipients = recipients
          .filter((r) => r.userId && r.userId.email)
          .map((r) => ({
            email: r.userId.email,
            data: {
              name: r.userId.name || r.userId.email.split("@")[0],
              title,
              message,
              actionUrl: actionUrl || "",
              actionText: actionText || "",
              date: new Date().toLocaleDateString(),
            },
          }))

        if (emailRecipients.length > 0) {
          // If we have a template ID, use it, otherwise send regular emails
          if (process.env.SENDGRID_NOTIFICATION_TEMPLATE_ID) {
            await sendBulkEmails(emailRecipients, process.env.SENDGRID_NOTIFICATION_TEMPLATE_ID)
          } else {
            // Send individual emails
            for (const recipient of emailRecipients) {
              await sendEmail(
                recipient.email,
                emailSubject || title,
                message,
                emailHtml ||
                  `<h2>${title}</h2><p>${message}</p>${actionUrl ? `<p><a href="${actionUrl}">${actionText || "View Details"}</a></p>` : ""}`,
              )
            }
          }
        }
      } catch (emailError) {
        console.error("Bulk email error:", emailError)
      }
    }

    // Send SMS if requested
    if (sendSMS) {
      try {
        const smsRecipients = recipients
          .filter((r) => r.userId && r.userId.phone)
          .map((r) => ({
            phone: r.userId.phone,
            message: `${title}: ${message} ${actionUrl ? actionUrl : ""}`,
          }))

        if (smsRecipients.length > 0) {
          await sendBulkSMS(smsRecipients)
        }
      } catch (smsError) {
        console.error("Bulk SMS error:", smsError)
      }
    }

    const response = {
      notificationsSent: notifications.length,
      recipients: recipients.length,
      type,
      priority,
      emailsSent: sendEmail,
      smsSent: sendSMS,
      createdAt: new Date(),
    }

    res.status(201).json(generateResponse(true, "System notification sent successfully", response))
  } catch (error) {
    console.error("Create system notification error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get notification statistics
 */
const getNotificationStats = async (employeeId) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { recipientId: employeeId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          high_priority: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] } },
        },
      },
    ])

    const typeStats = await Notification.aggregate([
      { $match: { recipientId: employeeId } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])

    return {
      total: stats[0]?.total || 0,
      unread: stats[0]?.unread || 0,
      highPriority: stats[0]?.high_priority || 0,
      urgent: stats[0]?.urgent || 0,
      byType: typeStats,
    }
  } catch (error) {
    console.error("Get notification stats error:", error)
    return {
      total: 0,
      unread: 0,
      highPriority: 0,
      urgent: 0,
      byType: [],
    }
  }
}

/**
 * Get notification icon based on type
 */
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
    employee_joined: "👋",
    employee_left: "👋",
    system_announcement: "📢",
  }

  return iconMap[type] || "📢"
}

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.user

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    // Mark all unread notifications as read
    const result = await Notification.updateMany(
      { recipientId: adminEmployee._id, isRead: false },
      { isRead: true, readAt: new Date() },
    )

    res.status(200).json(
      generateResponse(true, "All notifications marked as read", {
        updatedCount: result.modifiedCount,
      }),
    )
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.user

    // Find admin employee
    const adminUser = await User.findById(userId)
    const adminEmployee = await Employee.findOne({ userId: adminUser._id })

    if (!adminEmployee) {
      return res.status(404).json(generateResponse(false, "Admin employee record not found"))
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientId: adminEmployee._id,
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

module.exports = {
  getAdminNotifications,
  createSystemNotification,
  markAllAsRead,
  deleteNotification,
}
