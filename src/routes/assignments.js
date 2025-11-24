const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  addSubmission,
  getAssignmentDetails,
  assignmentFeed,
} = require("../controllers/assignments.controller");

router.post("/", auth, createAssignment);

router.put("/:id", auth, updateAssignment);

router.delete("/:id", auth, deleteAssignment);

router.get("/", auth, assignmentFeed);

router.post("/:id/submit", auth, addSubmission);

router.get("/:id", auth, getAssignmentDetails);

module.exports = router;
