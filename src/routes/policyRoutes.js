const express = require("express")
const {
  getAllPolicies,
  getPolicyById,
  downloadPolicy,
  getPolicyCategories,
} = require("../controllers/policyController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getAllPolicies)
router.get("/categories", getPolicyCategories)
router.get("/:id", getPolicyById)
router.get("/:id/download", downloadPolicy)

module.exports = router
