const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const moment = require("moment")
const {
  User,
  Employee,
  Payroll,
  Policy,
  Holiday,
  LeaveRequest,
  Attendance,
  SupportTicket,
  Chat,
  Notification,
} = require("../models")
const { seedNotifications } = require("./notificationSeeder")
const { seedAdminData } = require("./adminSeeder")

const seedSampleData = async () => {
  try {
    console.log("🌱 Starting database seeding...")

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Employee.deleteMany({}),
      Payroll.deleteMany({}),
      Policy.deleteMany({}),
      Holiday.deleteMany({}),
      LeaveRequest.deleteMany({}),
      Attendance.deleteMany({}),
      SupportTicket.deleteMany({}),
      Chat.deleteMany({}),
      Notification.deleteMany({}),
    ])

    // Create sample users
    const hashedPassword = await bcrypt.hash("password", 12)

    const sampleUser1 = new User({
      email: "kakashi@technorizen.com",
      password: hashedPassword,
      name: "Kakashi Hatake",
      phone: "+1234567890",
      dateOfBirth: new Date("1990-05-15"),
      address: "123 Main Street, City, State",
      emergencyContact: "+1234567899",
    })
    await sampleUser1.save()

    const sampleUser2 = new User({
      email: "rose.parker@technorizen.com",
      password: hashedPassword,
      name: "Rose Parker",
      phone: "+1234567891",
      dateOfBirth: new Date("1992-03-20"),
      address: "456 Oak Avenue, City, State",
      emergencyContact: "+1234567898",
    })
    await sampleUser2.save()

    // Create sample employees
    const sampleEmployee1 = new Employee({
      employeeId: "EMP001",
      userId: sampleUser1._id,
      role: "UI/UX Designer",
      department: "Design",
      designation: "Senior Designer",
      salary: 30000,
      joinDate: new Date("2023-01-15"),
    })
    await sampleEmployee1.save()

    const sampleEmployee2 = new Employee({
      employeeId: "EMP002",
      userId: sampleUser2._id,
      role: "Frontend Developer",
      department: "Development",
      designation: "Senior Developer",
      salary: 32000,
      joinDate: new Date("2023-02-01"),
    })
    await sampleEmployee2.save()

    // Create sample chat
    const sampleChat = new Chat({
      participants: [sampleEmployee1._id, sampleEmployee2._id],
      chatType: "direct",
      messages: [
        {
          senderId: sampleEmployee2._id,
          content: "Hey! 👋 What's up?",
          messageType: "text",
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
        {
          senderId: sampleEmployee1._id,
          content: "Not much, just relaxing after work. You?",
          messageType: "text",
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 50 * 60 * 1000), // 50 minutes ago
        },
        {
          senderId: sampleEmployee2._id,
          content: "Same here. Long day I needed like three coffees to survive it 😅",
          messageType: "text",
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
        },
        {
          senderId: sampleEmployee1._id,
          content: "Haha relatable! 😄 Did anything interesting happen?",
          messageType: "text",
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
        {
          senderId: sampleEmployee2._id,
          content: "Not really, unless you count me accidentally sending a meme to my boss instead of my friend...",
          messageType: "text",
          isRead: true,
          readAt: new Date(),
          createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        },
        {
          senderId: sampleEmployee1._id,
          content: "NO WAY! 😱 What was the meme?",
          messageType: "text",
          isRead: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      ],
      lastActivity: new Date(),
    })
    await sampleChat.save()

    // Create sample payroll records
    const payrollRecords = []
    for (let month = 1; month <= 12; month++) {
      const payroll = new Payroll({
        employeeId: sampleEmployee1._id,
        month,
        year: 2025,
        basicSalary: 27000,
        allowances: {
          hra: 2000,
          transport: 1000,
          medical: 500,
        },
        deductions: {
          tax: 2000,
          pf: 800,
          insurance: 200,
        },
        totalSalary: 30500,
        netSalary: 27500,
        status: month === 1 ? "paid" : "processed",
        processedDate: new Date(`2025-${month}-28`),
        paidDate: month === 1 ? new Date("2025-01-01") : null,
      })
      payrollRecords.push(payroll)
    }
    await Payroll.insertMany(payrollRecords)

    // Create sample policies
    const policies = [
      {
        title: "New Employee Policies",
        category: "HR Policies",
        description: "Comprehensive guide for new employees",
        content: "Detailed policy content for new employees...",
        effectiveDate: new Date("2025-01-01"),
        isActive: true,
      },
      {
        title: "Salary and Benefits Policy",
        category: "Compensation",
        description: "Salary structure and benefits information",
        content: "Detailed salary and benefits policy...",
        effectiveDate: new Date("2025-01-01"),
        isActive: true,
      },
      {
        title: "Leave and Attendance Policy",
        category: "Time Off",
        description: "Leave policies and attendance guidelines",
        content: "Detailed leave and attendance policy...",
        effectiveDate: new Date("2025-01-01"),
        isActive: true,
      },
    ]
    await Policy.insertMany(policies)

    // Create sample holidays
    const holidays = [
      {
        name: "Raksha Bandhan",
        date: new Date("2025-08-09"),
        day: "Saturday",
        type: "festival",
        description: "Hindu festival celebrating the bond between brothers and sisters",
      },
      {
        name: "Independence Day",
        date: new Date("2025-08-15"),
        day: "Friday",
        type: "national",
        description: "Indian Independence Day",
      },
      {
        name: "Ganesh Chaturthi",
        date: new Date("2025-08-27"),
        day: "Wednesday",
        type: "festival",
        description: "Hindu festival honoring Lord Ganesha",
      },
    ]
    await Holiday.insertMany(holidays)

    // Create sample leave requests
    const leaveRequests = [
      {
        employeeId: sampleEmployee1._id,
        leaveType: "sick",
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-15"),
        days: 1,
        reason: "Medical appointment",
        status: "approved",
        appliedDate: new Date("2025-01-10"),
      },
      {
        employeeId: sampleEmployee1._id,
        leaveType: "casual",
        startDate: new Date("2025-01-19"),
        endDate: new Date("2025-01-19"),
        days: 0.5,
        reason: "Personal work",
        status: "approved",
        appliedDate: new Date("2025-01-17"),
        isHalfDay: true,
        halfDayPeriod: "morning",
      },
    ]
    await LeaveRequest.insertMany(leaveRequests)

    // Create sample support ticket
    const supportTicket = new SupportTicket({
      employeeId: sampleEmployee1._id,
      category: "Leave and Attendance",
      subject: "Leave balance inquiry",
      description: "I need to check my remaining leave balance for this year.",
      priority: "medium",
      status: "open",
    })
    await supportTicket.save()

    // Seed notifications
    await seedNotifications()

    await seedAdminData()

    console.log("✅ Sample data seeded successfully!")
    console.log("📧 Login credentials:")
    console.log("   Email: kakashi@technorizen.com")
    console.log("   Password: password")
    console.log("   Email: rose.parker@technorizen.com")
    console.log("   Password: password")
  } catch (error) {
    console.error("❌ Error seeding data:", error)
  }
}

module.exports = { seedSampleData }
