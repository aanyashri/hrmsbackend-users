const express = require("express")
const router = express.Router()
const {
  getAllPerformanceRecords,
  createPerformanceRecord,
  updatePerformanceCompletion,
  conductPerformanceReview,
  getPerformanceStats,
} = require("../controllers/adminPerformanceController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Performance routes
router.get("/", getAllPerformanceRecords)
router.post("/", createPerformanceRecord)
router.get("/stats", getPerformanceStats)
router.put("/:id/completion", updatePerformanceCompletion)
router.put("/:id/review", conductPerformanceReview)

module.exports = router
