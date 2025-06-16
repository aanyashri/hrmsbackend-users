const express = require("express")
const router = express.Router()
const {
  getAllPayrolls,
  generatePayroll,
  processPayroll,
  makePayment,
  getPaymentMethod,
  updatePaymentMethod,
  generatePayslip,
} = require("../controllers/adminPayrollController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Payroll routes
router.get("/", getAllPayrolls)
router.post("/generate", generatePayroll)
router.put("/process", processPayroll)
router.put("/:id/payment", makePayment)
router.get("/payment-method", getPaymentMethod)
router.put("/payment-method", updatePaymentMethod)
router.get("/:id/payslip", generatePayslip)

module.exports = router
