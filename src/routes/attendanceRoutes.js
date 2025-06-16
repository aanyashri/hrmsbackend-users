const express = require("express")
const {
  checkIn,
  checkOut,
  getAttendanceRecords,
  getAttendanceSummary,
  getAttendanceStats,
} = require("../controllers/attendanceController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.post("/checkin", checkIn)
router.post("/checkout", checkOut)
router.get("/records", getAttendanceRecords)
router.get("/summary", getAttendanceSummary)
router.get("/stats", getAttendanceStats)

module.exports = router
