const express = require("express")
const router = express.Router()
const {
  uploadFiles,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  downloadPolicyAttachment,
  removePolicyAttachment,
  getPolicyCategories,
  getPolicyStatistics,
} = require("../controllers/policyAdminController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Policy routes
router.get("/", getAllPolicies)
router.post("/", uploadFiles, createPolicy)
router.get("/categories", getPolicyCategories)
router.get("/statistics", getPolicyStatistics)
router.put("/:id", uploadFiles, updatePolicy)
router.delete("/:id", deletePolicy)
router.get("/:id/attachments/:attachmentId/download", downloadPolicyAttachment)
router.delete("/:id/attachments/:attachmentId", removePolicyAttachment)

module.exports = router
