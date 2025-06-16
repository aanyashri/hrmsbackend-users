const express = require("express")
const {
  getMyPayrollRecords,
  getPayrollById,
  getCurrentPayroll,
  getPayrollSummary,
} = require("../controllers/payrollController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/records", getMyPayrollRecords)
router.get("/current", getCurrentPayroll)
router.get("/summary", getPayrollSummary)
router.get("/:id", getPayrollById)

module.exports = router
