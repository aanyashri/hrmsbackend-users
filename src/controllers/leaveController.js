const moment = require("moment")
const { generateResponse } = require("../utils/responseHelper")
const { LeaveRequest, Employee, User } = require("../models")

const applyLeave = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { leaveType, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json(generateResponse(false, "All fields are required"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Calculate number of days
    const start = moment(startDate)
    const end = moment(endDate)
    let days = end.diff(start, "days") + 1

    if (days <= 0) {
      return res.status(400).json(generateResponse(false, "Invalid date range"))
    }

    // Adjust days for half day
    if (isHalfDay && days === 1) {
      days = 0.5
    }

    // Check for overlapping leave requests
    const overlappingLeave = await LeaveRequest.findOne({
      employeeId: employee._id,
      status: { $in: ["pending", "approved"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
      ],
    })

    if (overlappingLeave) {
      return res.status(400).json(generateResponse(false, "Leave request overlaps with existing leave"))
    }

    const newLeaveRequest = new LeaveRequest({
      employeeId: employee._id,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayPeriod: halfDayPeriod || null,
      appliedDate: new Date(),
    })

    await newLeaveRequest.save()

    // Populate employee data
    await newLeaveRequest.populate("employee")

    res.status(201).json(generateResponse(true, "Leave request submitted successfully", newLeaveRequest))
  } catch (error) {
    console.error("Apply leave error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getLeaveRequests = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { status, page = 1, limit = 10, year, month } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = { employeeId: employee._id }

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Filter by year and month if provided
    if (year && month) {
      const startDate = moment(`${year}-${month}-01`).startOf("month").toDate()
      const endDate = moment(`${year}-${month}-01`).endOf("month").toDate()
      query.$or = [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ]
    }

    // Get total count
    const totalRequests = await LeaveRequest.countDocuments(query)

    // Get paginated requests
    const requests = await LeaveRequest.find(query)
      .populate("employee")
      .populate("approver")
      .sort({ appliedDate: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const response = {
      requests,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        hasNext: page * limit < totalRequests,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Leave requests retrieved successfully", response))
  } catch (error) {
    console.error("Get leave requests error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getLeaveCalendar = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { year = moment().year(), month = moment().month() + 1 } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Get start and end dates for the month
    const startDate = moment(`${year}-${month}-01`).startOf("month").toDate()
    const endDate = moment(`${year}-${month}-01`).endOf("month").toDate()

    // Get all approved leave requests for the month
    const leaveRequests = await LeaveRequest.find({
      employeeId: employee._id,
      status: "approved",
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).populate("employee")

    // Create calendar data
    const calendarData = {
      year: Number.parseInt(year),
      month: Number.parseInt(month),
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
        if (current.month() === month - 1 && current.year() === Number.parseInt(year)) {
          calendarData.leaveDays.push({
            date: current.date(),
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

const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user
    const updates = req.body

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      employeeId: employee._id,
    })

    if (!leaveRequest) {
      return res.status(404).json(generateResponse(false, "Leave request not found"))
    }

    // Only allow updates if status is pending
    if (leaveRequest.status !== "pending") {
      return res.status(400).json(generateResponse(false, "Cannot update processed leave request"))
    }

    // Update leave request
    Object.assign(leaveRequest, updates)
    await leaveRequest.save()

    await leaveRequest.populate("employee")

    res.status(200).json(generateResponse(true, "Leave request updated successfully", leaveRequest))
  } catch (error) {
    console.error("Update leave request error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const leaveRequest = await LeaveRequest.findOne({
      _id: id,
      employeeId: employee._id,
    })

    if (!leaveRequest) {
      return res.status(404).json(generateResponse(false, "Leave request not found"))
    }

    // Only allow cancellation if status is pending
    if (leaveRequest.status !== "pending") {
      return res.status(400).json(generateResponse(false, "Cannot cancel processed leave request"))
    }

    leaveRequest.status = "cancelled"
    await leaveRequest.save()

    res.status(200).json(generateResponse(true, "Leave request cancelled successfully"))
  } catch (error) {
    console.error("Cancel leave request error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.user
    const currentYear = moment().year()

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Calculate leave balance for current year
    const yearlyLeaves = await LeaveRequest.find({
      employeeId: employee._id,
      status: "approved",
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    })

    const usedLeaves = yearlyLeaves.reduce((sum, request) => sum + request.days, 0)

    // Calculate by leave type
    const sickLeaves = yearlyLeaves.filter((r) => r.leaveType === "sick").reduce((sum, r) => sum + r.days, 0)

    const casualLeaves = yearlyLeaves.filter((r) => r.leaveType === "casual").reduce((sum, r) => sum + r.days, 0)

    const annualLeaves = yearlyLeaves.filter((r) => r.leaveType === "annual").reduce((sum, r) => sum + r.days, 0)

    const leaveBalance = {
      year: currentYear,
      totalLeaves: 24, // Annual leave allocation
      usedLeaves,
      remainingLeaves: 24 - usedLeaves,
      sickLeaves: {
        total: 12,
        used: sickLeaves,
        remaining: 12 - sickLeaves,
      },
      casualLeaves: {
        total: 12,
        used: casualLeaves,
        remaining: 12 - casualLeaves,
      },
      annualLeaves: {
        total: 24,
        used: annualLeaves,
        remaining: 24 - annualLeaves,
      },
    }

    res.status(200).json(generateResponse(true, "Leave balance retrieved successfully", leaveBalance))
  } catch (error) {
    console.error("Get leave balance error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  applyLeave,
  getLeaveRequests,
  getLeaveCalendar,
  updateLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
}
