const express = require("express")
const {
  applyLeave,
  getLeaveRequests,
  getLeaveCalendar,
  updateLeaveRequest,
  cancelLeaveRequest,
  getLeaveBalance,
} = require("../controllers/leaveController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.post("/apply", applyLeave)
router.get("/requests", getLeaveRequests)
router.get("/calendar", getLeaveCalendar)
router.put("/requests/:id", updateLeaveRequest)
router.delete("/requests/:id", cancelLeaveRequest)
router.get("/balance", getLeaveBalance)

module.exports = router
