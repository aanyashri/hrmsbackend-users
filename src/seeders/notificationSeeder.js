const { Notification, Employee } = require("../models")

const seedNotifications = async () => {
  try {
    console.log("🔔 Seeding notifications...")

    // Find sample employee
    const employee = await Employee.findOne({ employeeId: "EMP001" })
    if (!employee) {
      console.log("❌ No employee found for notifications")
      return
    }

    const notifications = [
      {
        recipientId: employee._id,
        type: "policy_update",
        title: "New first policy effective from Jan 1! Please",
        message:
          "A new company policy regarding remote work has been implemented. Please review the updated guidelines.",
        priority: "high",
        actionUrl: "/policies/remote-work",
        actionText: "View Policy",
        category: "recent",
      },
      {
        recipientId: employee._id,
        type: "shift_schedule",
        title: "Your shift schedule has been updated. Check the",
        message: "Your work schedule for next week has been modified. Please check the updated timings.",
        priority: "medium",
        actionUrl: "/attendance/schedule",
        actionText: "View Schedule",
        category: "recent",
      },
      {
        recipientId: employee._id,
        type: "payroll_processed",
        title: "Your Jan salary has been processed. Payslip is",
        message: "Your January salary has been processed and will be credited to your account within 2 business days.",
        priority: "medium",
        actionUrl: "/payroll/current",
        actionText: "View Payslip",
        category: "recent",
      },
      {
        recipientId: employee._id,
        type: "performance_review",
        title: "Your performance review period begins April 1.",
        message: "Your quarterly performance review is scheduled to begin. Please prepare your self-assessment.",
        priority: "medium",
        actionUrl: "/performance/review",
        actionText: "Start Review",
        category: "earlier",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        recipientId: employee._id,
        type: "holiday_announcement",
        title: "Raksha Bandhan",
        message: "Raksha Bandhan holiday has been announced for August 9th, 2025.",
        priority: "low",
        actionUrl: "/holidays",
        actionText: "View Calendar",
        category: "earlier",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
      {
        recipientId: employee._id,
        type: "holiday_announcement",
        title: "Independence day",
        message: "Independence Day holiday has been announced for August 15th, 2025.",
        priority: "low",
        actionUrl: "/holidays",
        actionText: "View Calendar",
        category: "earlier",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      },
      {
        recipientId: employee._id,
        type: "holiday_announcement",
        title: "Parsi New Year",
        message: "Parsi New Year holiday has been announced for August 16th, 2025.",
        priority: "low",
        actionUrl: "/holidays",
        actionText: "View Calendar",
        category: "earlier",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        recipientId: employee._id,
        type: "holiday_announcement",
        title: "Janmashtami",
        message: "Janmashtami holiday has been announced for August 16th, 2025.",
        priority: "low",
        actionUrl: "/holidays",
        actionText: "View Calendar",
        category: "earlier",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      },
      {
        recipientId: employee._id,
        type: "holiday_announcement",
        title: "Ganesh Chaturthi",
        message: "Ganesh Chaturthi holiday has been announced for August 27th, 2025.",
        priority: "low",
        actionUrl: "/holidays",
        actionText: "View Calendar",
        category: "earlier",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    ]

    await Notification.insertMany(notifications)
    console.log("✅ Notifications seeded successfully!")
  } catch (error) {
    console.error("❌ Error seeding notifications:", error)
  }
}

module.exports = { seedNotifications }
