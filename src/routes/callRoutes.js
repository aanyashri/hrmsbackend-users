const express = require("express")
const { initiateCall, updateCallStatus, getCallHistory, getActiveCall } = require("../controllers/callController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.post("/initiate", initiateCall)
router.put("/:callId/status", updateCallStatus)
router.get("/history", getCallHistory)
router.get("/active", getActiveCall)

module.exports = router
