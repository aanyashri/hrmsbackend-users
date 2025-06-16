const { generateResponse } = require("../utils/responseHelper")
const { Attendance, Employee, User, LeaveRequest } = require("../models")
const mongoose = require("mongoose")
const moment = require("moment")

/**
 * Get attendance log with filtering
 */
const getAttendanceLog = async (req, res) => {
  try {
    const { date, employeeId, department, status, page = 1, limit = 20 } = req.query

    // Build query
    const query = {}

    // Filter by date if provided
    if (date) {
      const startDate = moment(date).startOf("day").toDate()
      const endDate = moment(date).endOf("day").toDate()
      query.date = { $gte: startDate, $lte: endDate }
    }

    // Filter by employee if provided
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId })
      if (employee) {
        query.employeeId = employee._id
      }
    }

    // Filter by status if provided
    if (status) {
      query.status = status
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
    const totalRecords = await Attendance.countDocuments(query)

    // Get paginated records
    const attendanceRecords = await Attendance.find(query)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          model: "User",
          select: "name email",
        },
      })
      .sort({ date: -1, checkIn: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    // Format records for frontend
    const formattedRecords = attendanceRecords.map((record) => {
      const employee = record.employeeId
      const user = employee.userId || {}

      // Calculate total hours if check-in and check-out are available
      let totalHours = 0
      if (record.checkIn && record.checkOut) {
        const checkInTime = moment(`${moment(record.date).format("YYYY-MM-DD")} ${record.checkIn}`)
        const checkOutTime = moment(`${moment(record.date).format("YYYY-MM-DD")} ${record.checkOut}`)
        totalHours = checkOutTime.diff(checkInTime, "hours", true).toFixed(2)
      }

      return {
        id: record._id,
        employeeName: user.name || "Unknown",
        employeeId: employee.employeeId,
        department: employee.department,
        date: moment(record.date).format("MMM DD, YYYY"),
        checkIn: record.checkIn || "",
        checkOut: record.checkOut || "",
        totalHours: record.workingHours || totalHours || 0,
        status: record.status,
        location: record.location || "Office",
      }
    })

    const response = {
      attendanceRecords: formattedRecords,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Attendance records retrieved successfully", response))
  } catch (error) {
    console.error("Get attendance log error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get company-wide attendance statistics
 */
const getCompanyWideStats = async (req, res) => {
  try {
    const { date = new Date() } = req.query

    const startDate = moment(date).startOf("day").toDate()
    const endDate = moment(date).endOf("day").toDate()

    // Get total employees
    const totalEmployees = await Employee.countDocuments({ isActive: true })

    // Get attendance for the day
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })

    // Calculate statistics
    const presentCount = attendanceRecords.filter((record) => record.status === "present").length
    const absentCount = totalEmployees - presentCount
    const onLeaveCount = attendanceRecords.filter((record) => record.status === "leave").length

    // Calculate percentages
    const presentPercentage = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0
    const absentPercentage = totalEmployees > 0 ? (absentCount / totalEmployees) * 100 : 0
    const onLeavePercentage = totalEmployees > 0 ? (onLeaveCount / totalEmployees) * 100 : 0

    const stats = {
      date: moment(date).format("YYYY-MM-DD"),
      totalEmployees,
      presentCount,
      absentCount,
      onLeaveCount,
      presentPercentage: Math.round(presentPercentage),
      absentPercentage: Math.round(absentPercentage),
      onLeavePercentage: Math.round(onLeavePercentage),
      chartData: [
        { name: "Present", value: presentCount, color: "#4CAF50" },
        { name: "Absent", value: absentCount, color: "#F44336" },
        { name: "On Leave", value: onLeaveCount, color: "#2196F3" },
      ],
    }

    res.status(200).json(generateResponse(true, "Company-wide attendance statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get company-wide stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get employee leave management statistics
 */
const getLeaveManagementStats = async (req, res) => {
  try {
    // Get leave requests
    const pendingLeaves = await LeaveRequest.countDocuments({ status: "pending" })
    const approvedLeaves = await LeaveRequest.countDocuments({ status: "approved" })
    const rejectedLeaves = await LeaveRequest.countDocuments({ status: "rejected" })

    const stats = {
      pendingLeaves,
      approvedLeaves,
      rejectedLeaves,
      chartData: [
        { name: "Pending", value: pendingLeaves, color: "#FFC107" },
        { name: "Approved", value: approvedLeaves, color: "#4CAF50" },
        { name: "Rejected", value: rejectedLeaves, color: "#F44336" },
      ],
    }

    res.status(200).json(generateResponse(true, "Leave management statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get leave management stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Mark attendance for an employee (admin function)
 */
const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, notes } = req.body

    if (!employeeId || !date || !status) {
      return res.status(400).json(generateResponse(false, "Employee ID, date and status are required"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const attendanceDate = moment(date).startOf("day").toDate()

    // Check if attendance record already exists
    let attendanceRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: attendanceDate,
    })

    if (attendanceRecord) {
      // Update existing record
      attendanceRecord.checkIn = checkIn || attendanceRecord.checkIn
      attendanceRecord.checkOut = checkOut || attendanceRecord.checkOut
      attendanceRecord.status = status
      attendanceRecord.notes = notes || attendanceRecord.notes
      attendanceRecord.approvedBy = req.user.id
      attendanceRecord.approvedAt = new Date()

      // Calculate working hours if both check-in and check-out are available
      if (checkIn && checkOut) {
        const checkInTime = moment(`${moment(date).format("YYYY-MM-DD")} ${checkIn}`)
        const checkOutTime = moment(`${moment(date).format("YYYY-MM-DD")} ${checkOut}`)
        attendanceRecord.workingHours = checkOutTime.diff(checkInTime, "hours", true).toFixed(2)
      }
    } else {
      // Create new record
      attendanceRecord = new Attendance({
        employeeId: employee._id,
        date: attendanceDate,
        checkIn,
        checkOut,
        status,
        notes,
        approvedBy: req.user.id,
        approvedAt: new Date(),
      })

      // Calculate working hours if both check-in and check-out are available
      if (checkIn && checkOut) {
        const checkInTime = moment(`${moment(date).format("YYYY-MM-DD")} ${checkIn}`)
        const checkOutTime = moment(`${moment(date).format("YYYY-MM-DD")} ${checkOut}`)
        attendanceRecord.workingHours = checkOutTime.diff(checkInTime, "hours", true).toFixed(2)
      }
    }

    await attendanceRecord.save()

    res.status(200).json(generateResponse(true, "Attendance marked successfully", attendanceRecord))
  } catch (error) {
    console.error("Mark attendance error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get attendance report
 */
const getAttendanceReport = async (req, res) => {
  try {
    const { month, year, department } = req.query

    if (!month || !year) {
      return res.status(400).json(generateResponse(false, "Month and year are required"))
    }

    const startDate = moment(`${year}-${month}-01`).startOf("month").toDate()
    const endDate = moment(`${year}-${month}-01`).endOf("month").toDate()

    // Build query
    const query = {
      date: { $gte: startDate, $lte: endDate },
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

    // Get attendance records
    const attendanceRecords = await Attendance.find(query).populate({
      path: "employeeId",
      populate: {
        path: "userId",
        model: "User",
        select: "name email",
      },
    })

    // Group by employee
    const employeeAttendance = {}
    attendanceRecords.forEach((record) => {
      const employeeId = record.employeeId._id.toString()
      if (!employeeAttendance[employeeId]) {
        employeeAttendance[employeeId] = {
          employeeName: record.employeeId.userId ? record.employeeId.userId.name : "Unknown",
          employeeId: record.employeeId.employeeId,
          department: record.employeeId.department,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          totalWorkingHours: 0,
          records: [],
        }
      }

      // Update counts
      if (record.status === "present") {
        employeeAttendance[employeeId].presentDays++
      } else if (record.status === "absent") {
        employeeAttendance[employeeId].absentDays++
      } else if (record.status === "leave") {
        employeeAttendance[employeeId].leaveDays++
      }

      // Add working hours
      employeeAttendance[employeeId].totalWorkingHours += Number(record.workingHours || 0)

      // Add record
      employeeAttendance[employeeId].records.push({
        date: moment(record.date).format("YYYY-MM-DD"),
        status: record.status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workingHours: record.workingHours,
      })
    })

    // Convert to array
    const report = Object.values(employeeAttendance)

    res.status(200).json(generateResponse(true, "Attendance report retrieved successfully", report))
  } catch (error) {
    console.error("Get attendance report error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAttendanceLog,
  getCompanyWideStats,
  getLeaveManagementStats,
  markAttendance,
  getAttendanceReport,
}
