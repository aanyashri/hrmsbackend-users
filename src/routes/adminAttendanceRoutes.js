const express = require("express")
const router = express.Router()
const {
  getAttendanceLog,
  getCompanyWideStats,
  getLeaveManagementStats,
  markAttendance,
  getAttendanceReport,
} = require("../controllers/adminAttendanceController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Attendance routes
router.get("/log", getAttendanceLog)
router.get("/company-stats", getCompanyWideStats)
router.get("/leave-stats", getLeaveManagementStats)
router.post("/mark", markAttendance)
router.get("/report", getAttendanceReport)

module.exports = router
