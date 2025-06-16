const express = require("express")
const {
  createSupportTicket,
  getMySupportTickets,
  getSupportTicketById,
  addTicketResponse,
  getHRContactInfo,
} = require("../controllers/supportController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.post("/tickets", createSupportTicket)
router.get("/tickets", getMySupportTickets)
router.get("/tickets/:id", getSupportTicketById)
router.post("/tickets/:id/responses", addTicketResponse)
router.get("/contact", getHRContactInfo)

module.exports = router
