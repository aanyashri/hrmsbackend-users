const moment = require("moment")
const { generateResponse } = require("../utils/responseHelper")
const Employee = require("../models/Employee")
const Attendance = require("../models/Attendance")
const User = require("../models/User")

const checkIn = async (req, res) => {
  try {
    const { employeeId } = req.user
    const today = moment().format("YYYY-MM-DD")
    const currentTime = moment().format("HH:mm:ss")

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Check if already checked in today
    const existingRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
    })

    if (existingRecord && existingRecord.checkIn) {
      return res.status(400).json(generateResponse(false, "Already checked in today"))
    }

    let attendanceRecord
    if (existingRecord) {
      // Update existing record
      attendanceRecord = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        {
          checkIn: currentTime,
          status: "present",
        },
        { new: true },
      )
    } else {
      // Create new record
      attendanceRecord = await Attendance.create({
        employeeId: employee._id,
        date: today,
        checkIn: currentTime,
        status: "present",
      })
    }

    res.status(200).json(
      generateResponse(true, "Checked in successfully", {
        checkInTime: currentTime,
        date: today,
        id: attendanceRecord._id,
      }),
    )
  } catch (error) {
    console.error("Check in error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const checkOut = async (req, res) => {
  try {
    const { employeeId } = req.user
    const today = moment().format("YYYY-MM-DD")
    const currentTime = moment().format("HH:mm:ss")

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const attendanceRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: today,
    })

    if (!attendanceRecord || !attendanceRecord.checkIn) {
      return res.status(400).json(generateResponse(false, "No check-in record found for today"))
    }

    if (attendanceRecord.checkOut) {
      return res.status(400).json(generateResponse(false, "Already checked out today"))
    }

    // Calculate working hours
    const checkInTime = moment(`${today} ${attendanceRecord.checkIn}`)
    const checkOutTime = moment(`${today} ${currentTime}`)
    const workingHours = checkOutTime.diff(checkInTime, "hours", true)
    const overtime = Math.max(0, workingHours - 8)

    const updatedRecord = await Attendance.findByIdAndUpdate(
      attendanceRecord._id,
      {
        checkOut: currentTime,
        workingHours: Math.round(workingHours * 100) / 100,
        overtime: Math.round(overtime * 100) / 100,
      },
      { new: true },
    )

    res.status(200).json(
      generateResponse(true, "Checked out successfully", {
        checkOutTime: currentTime,
        workingHours: updatedRecord.workingHours,
        overtime: updatedRecord.overtime,
      }),
    )
  } catch (error) {
    console.error("Check out error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAttendanceRecords = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { month, year, page = 1, limit = 20, status } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = { employeeId: employee._id }

    // Filter by month and year if provided
    if (month && year) {
      const startDate = moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD")
      const endDate = moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD")
      query.date = {
        $gte: startDate,
        $lte: endDate,
      }
    }

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Get total count
    const totalRecords = await Attendance.countDocuments(query)

    // Get paginated records
    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })

    const response = {
      records,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Attendance records retrieved successfully", response))
  } catch (error) {
    console.error("Get attendance records error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { month = moment().month() + 1, year = moment().year() } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const startDate = moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD")
    const endDate = moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD")

    const monthRecords = await Attendance.find({
      employeeId: employee._id,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })

    const summary = {
      totalDays: moment(`${year}-${month}`, "YYYY-MM").daysInMonth(),
      presentDays: monthRecords.filter((r) => r.status === "present").length,
      halfDays: monthRecords.filter((r) => r.status === "half-day").length,
      leaveDays: monthRecords.filter((r) => r.status === "leave").length,
      absentDays: monthRecords.filter((r) => r.status === "absent").length,
      totalWorkingHours: monthRecords.reduce((sum, r) => sum + (Number.parseFloat(r.workingHours) || 0), 0),
      totalOvertime: monthRecords.reduce((sum, r) => sum + (Number.parseFloat(r.overtime) || 0), 0),
      attendancePercentage:
        monthRecords.length > 0
          ? Math.round((monthRecords.filter((r) => r.status === "present").length / monthRecords.length) * 100)
          : 0,
    }

    res.status(200).json(generateResponse(true, "Attendance summary retrieved successfully", summary))
  } catch (error) {
    console.error("Get attendance summary error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getAttendanceStats = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { year = moment().year() } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const startDate = moment(`${year}-01-01`).format("YYYY-MM-DD")
    const endDate = moment(`${year}-12-31`).format("YYYY-MM-DD")

    const yearRecords = await Attendance.find({
      employeeId: employee._id,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })

    // Monthly breakdown
    const monthlyStats = []
    for (let month = 1; month <= 12; month++) {
      const monthStart = moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD")
      const monthEnd = moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD")

      const monthRecords = yearRecords.filter((r) => moment(r.date).isBetween(monthStart, monthEnd, null, "[]"))

      monthlyStats.push({
        month,
        monthName: moment()
          .month(month - 1)
          .format("MMMM"),
        totalDays: moment(`${year}-${month}`, "YYYY-MM").daysInMonth(),
        presentDays: monthRecords.filter((r) => r.status === "present").length,
        absentDays: monthRecords.filter((r) => r.status === "absent").length,
        leaveDays: monthRecords.filter((r) => r.status === "leave").length,
        workingHours: monthRecords.reduce((sum, r) => sum + (Number.parseFloat(r.workingHours) || 0), 0),
      })
    }

    const stats = {
      year: Number.parseInt(year),
      totalWorkingDays: yearRecords.length,
      totalPresentDays: yearRecords.filter((r) => r.status === "present").length,
      totalAbsentDays: yearRecords.filter((r) => r.status === "absent").length,
      totalLeaveDays: yearRecords.filter((r) => r.status === "leave").length,
      totalWorkingHours: yearRecords.reduce((sum, r) => sum + (Number.parseFloat(r.workingHours) || 0), 0),
      totalOvertime: yearRecords.reduce((sum, r) => sum + (Number.parseFloat(r.overtime) || 0), 0),
      monthlyBreakdown: monthlyStats,
    }

    res.status(200).json(generateResponse(true, "Attendance statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get attendance stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  checkIn,
  checkOut,
  getAttendanceRecords,
  getAttendanceSummary,
  getAttendanceStats,
}
