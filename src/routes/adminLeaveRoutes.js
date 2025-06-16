const express = require("express")
const router = express.Router()
const {
  getAllLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveCalendar,
  getLeaveStatistics,
} = require("../controllers/adminLeaveController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Leave routes
router.get("/", getAllLeaveRequests)
router.get("/calendar", getLeaveCalendar)
router.get("/statistics", getLeaveStatistics)
router.put("/:id/approve", approveLeaveRequest)
router.put("/:id/reject", rejectLeaveRequest)

module.exports = router
