const { generateResponse } = require("../utils/responseHelper")
const { LeaveRequest, Employee, User, Attendance } = require("../models")
const mongoose = require("mongoose")
const moment = require("moment")
const { createNotification } = require("./notificationController")
const { sendEmail } = require("../utils/emailService")
const { sendSMS } = require("../utils/smsService")

/**
 * Get all leave requests with filtering
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, employeeId, department, month, year, page = 1, limit = 20 } = req.query

    // Build query
    const query = {}

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Filter by employee if provided
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId })
      if (employee) {
        query.employeeId = employee._id
      }
    }

    // Filter by month and year if provided
    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf("month").toDate()
      const endDate = moment(`${year}-${month}-01`).endOf("month").toDate()
      query.$or = [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ]
    }

    // Filter by department through employee lookup
    let employeeIds = []
    if (department) {
      const employees = await Employee.find({ department })
      employeeIds = employees.map((emp) => emp._id)
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds }
      }
    }

    // Count total records
    const totalRecords = await LeaveRequest.countDocuments(query)

    // Get paginated records
    const leaveRequests = await LeaveRequest.find(query)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          model: "User",
          select: "name email",
        },
      })
      .populate("approvedBy", "name email")
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    // Format records for frontend
    const formattedRequests = leaveRequests.map((request) => {
      const employee = request.employeeId
      const user = employee.userId || {}

      return {
        id: request._id,
        employeeName: user.name || "Unknown",
        employeeId: employee.employeeId,
        department: employee.department,
        leaveType: request.leaveType,
        startDate: moment(request.startDate).format("MM/DD/YYYY"),
        endDate: moment(request.endDate).format("MM/DD/YYYY"),
        days: request.days,
        reason: request.reason,
        status: request.status,
        appliedDate: moment(request.appliedDate).format("MM/DD/YYYY"),
        approvedBy: request.approvedBy ? request.approvedBy.name : null,
        approvedDate: request.approvedDate ? moment(request.approvedDate).format("MM/DD/YYYY") : null,
        rejectionReason: request.rejectionReason,
      }
    })

    const response = {
      leaveRequests: formattedRequests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Leave requests retrieved successfully", response))
  } catch (error) {
    console.error("Get leave requests error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Approve leave request
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    const leaveRequest = await LeaveRequest.findById(id)

    if (!leaveRequest) {
      return res.status(404).json(generateResponse(false, "Leave request not found"))
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json(generateResponse(false, "Leave request is not pending"))
    }

    // Update leave request
    leaveRequest.status = "approved"
    leaveRequest.approvedBy = req.user.id
    leaveRequest.approvedDate = new Date()
    leaveRequest.notes = notes || leaveRequest.notes

    await leaveRequest.save()

    // Update attendance records for the leave period
    const startDate = moment(leaveRequest.startDate)
    const endDate = moment(leaveRequest.endDate)
    const currentDate = startDate.clone()

    while (currentDate.isSameOrBefore(endDate)) {
      // Check if attendance record exists
      let attendanceRecord = await Attendance.findOne({
        employeeId: leaveRequest.employeeId,
        date: currentDate.toDate(),
      })

      if (attendanceRecord) {
        // Update existing record
        attendanceRecord.status = "leave"
        attendanceRecord.notes = `Leave approved: ${leaveRequest.leaveType}`
      } else {
        // Create new record
        attendanceRecord = new Attendance({
          employeeId: leaveRequest.employeeId,
          date: currentDate.toDate(),
          status: "leave",
          notes: `Leave approved: ${leaveRequest.leaveType}`,
        })
      }

      await attendanceRecord.save()
      currentDate.add(1, "day")
    }

    // Get employee details for notification
    const employee = await Employee.findById(leaveRequest.employeeId).populate("userId")

    if (employee && employee.userId) {
      // Create in-app notification
      await createNotification(
        leaveRequest.employeeId,
        "leave_approval",
        "Leave Request Approved",
        `Your ${leaveRequest.leaveType} leave request from ${moment(leaveRequest.startDate).format("MMM DD")} to ${moment(leaveRequest.endDate).format("MMM DD")} has been approved.`,
        {
          priority: "high",
          actionUrl: "/leave/my-requests",
          actionText: "View Leave Details",
          metadata: {
            entityType: "leave",
            entityId: leaveRequest._id,
          },
          // Send email notification
          sendEmail: true,
          emailHtml: `
            <h2>Leave Request Approved</h2>
            <p>Dear ${employee.userId.name},</p>
            <p>Your ${leaveRequest.leaveType} leave request has been approved.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Leave Type: ${leaveRequest.leaveType}</li>
              <li>Start Date: ${moment(leaveRequest.startDate).format("MMMM DD, YYYY")}</li>
              <li>End Date: ${moment(leaveRequest.endDate).format("MMMM DD, YYYY")}</li>
              <li>Days: ${leaveRequest.days}</li>
              <li>Status: Approved</li>
              <li>Approved Date: ${moment().format("MMMM DD, YYYY")}</li>
            </ul>
            <p>If you have any questions, please contact HR.</p>
          `,
          // Send SMS notification if employee has phone number
          sendSMS: employee.userId.phone ? true : false,
        },
      )
    }

    res.status(200).json(generateResponse(true, "Leave request approved successfully", leaveRequest))
  } catch (error) {
    console.error("Approve leave request error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Reject leave request
 */
const rejectLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body

    if (!rejectionReason) {
      return res.status(400).json(generateResponse(false, "Rejection reason is required"))
    }

    const leaveRequest = await LeaveRequest.findById(id)

    if (!leaveRequest) {
      return res.status(404).json(generateResponse(false, "Leave request not found"))
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json(generateResponse(false, "Leave request is not pending"))
    }

    // Update leave request
    leaveRequest.status = "rejected"
    leaveRequest.approvedBy = req.user.id
    leaveRequest.approvedDate = new Date()
    leaveRequest.rejectionReason = rejectionReason

    await leaveRequest.save()

    // Get employee details for notification
    const employee = await Employee.findById(leaveRequest.employeeId).populate("userId")

    if (employee && employee.userId) {
      // Create in-app notification
      await createNotification(
        leaveRequest.employeeId,
        "leave_rejection",
        "Leave Request Rejected",
        `Your ${leaveRequest.leaveType} leave request has been rejected. Reason: ${rejectionReason}`,
        {
          priority: "high",
          actionUrl: "/leave/my-requests",
          actionText: "View Leave Details",
          metadata: {
            entityType: "leave",
            entityId: leaveRequest._id,
          },
          // Send email notification
          sendEmail: true,
          emailHtml: `
            <h2>Leave Request Rejected</h2>
            <p>Dear ${employee.userId.name},</p>
            <p>Your ${leaveRequest.leaveType} leave request has been rejected.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Leave Type: ${leaveRequest.leaveType}</li>
              <li>Start Date: ${moment(leaveRequest.startDate).format("MMMM DD, YYYY")}</li>
              <li>End Date: ${moment(leaveRequest.endDate).format("MMMM DD, YYYY")}</li>
              <li>Days: ${leaveRequest.days}</li>
              <li>Status: Rejected</li>
              <li>Rejection Reason: ${rejectionReason}</li>
            </ul>
            <p>If you have any questions, please contact HR.</p>
          `,
          // Send SMS notification if employee has phone number
          sendSMS: employee.userId.phone ? true : false,
        },
      )
    }

    res.status(200).json(generateResponse(true, "Leave request rejected successfully", leaveRequest))
  } catch (error) {
    console.error("Reject leave request error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get leave calendar
 */
const getLeaveCalendar = async (req, res) => {
  try {
    const { month, year } = req.query

    if (!month || !year) {
      return res.status(400).json(generateResponse(false, "Month and year are required"))
    }

    // Get start and end dates for the month
    const startDate = moment(`${year}-${month}-01`).startOf("month").toDate()
    const endDate = moment(`${year}-${month}-01`).endOf("month").toDate()

    // Get all approved leave requests for the month
    const leaveRequests = await LeaveRequest.find({
      status: "approved",
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).populate({
      path: "employeeId",
      populate: {
        path: "userId",
        model: "User",
        select: "name email",
      },
    })

    // Create calendar data
    const calendarData = {
      year: Number(year),
      month: Number(month),
      monthName: moment()
        .month(month - 1)
        .format("MMMM"),
      daysInMonth: moment(`${year}-${month}`, "YYYY-MM").daysInMonth(),
      leaveRequests,
      leaveDays: [],
    }

    // Generate leave days array
    leaveRequests.forEach((leave) => {
      const leaveStart = moment(leave.startDate)
      const leaveEnd = moment(leave.endDate)
      const current = leaveStart.clone()

      while (current.isSameOrBefore(leaveEnd)) {
        if (current.month() === month - 1 && current.year() === Number(year)) {
          calendarData.leaveDays.push({
            date: current.date(),
            employeeName: leave.employeeId.userId ? leave.employeeId.userId.name : "Unknown",
            employeeId: leave.employeeId.employeeId,
            leaveType: leave.leaveType,
            isHalfDay: leave.isHalfDay,
            halfDayPeriod: leave.halfDayPeriod,
            reason: leave.reason,
          })
        }
        current.add(1, "day")
      }
    })

    res.status(200).json(generateResponse(true, "Leave calendar retrieved successfully", calendarData))
  } catch (error) {
    console.error("Get leave calendar error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get leave statistics
 */
const getLeaveStatistics = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query

    // Get leave requests for the year
    const startDate = moment(`${year}-01-01`).startOf("year").toDate()
    const endDate = moment(`${year}-12-31`).endOf("year").toDate()

    const leaveRequests = await LeaveRequest.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate },
    })

    // Calculate statistics
    const totalRequests = leaveRequests.length
    const approvedRequests = leaveRequests.filter((req) => req.status === "approved").length
    const pendingRequests = leaveRequests.filter((req) => req.status === "pending").length
    const rejectedRequests = leaveRequests.filter((req) => req.status === "rejected").length

    // Calculate leave days by type
    const leaveByType = {}
    leaveRequests
      .filter((req) => req.status === "approved")
      .forEach((req) => {
        if (!leaveByType[req.leaveType]) {
          leaveByType[req.leaveType] = 0
        }
        leaveByType[req.leaveType] += req.days
      })

    // Calculate leave days by month
    const leaveByMonth = Array(12).fill(0)
    leaveRequests
      .filter((req) => req.status === "approved")
      .forEach((req) => {
        const startMonth = moment(req.startDate).month()
        const endMonth = moment(req.endDate).month()

        if (startMonth === endMonth) {
          leaveByMonth[startMonth] += req.days
        } else {
          // Split days across months
          const startDate = moment(req.startDate)
          const endDate = moment(req.endDate)
          const currentDate = startDate.clone()

          while (currentDate.isSameOrBefore(endDate)) {
            const month = currentDate.month()
            leaveByMonth[month]++
            currentDate.add(1, "day")
          }
        }
      })

    const stats = {
      year: Number(year),
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      leaveByType,
      leaveByMonth: leaveByMonth.map((days, index) => ({
        month: moment().month(index).format("MMMM"),
        days,
      })),
    }

    res.status(200).json(generateResponse(true, "Leave statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get leave statistics error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveCalendar,
  getLeaveStatistics,
}
