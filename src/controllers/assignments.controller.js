const db = require("../config/db");

function formatPretty(date) {
  const d = new Date(date);
  return d
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}
//Create Assignment
exports.createAssignment = async (req, res) => {
  try {
    if (req.user.role !== "TUTOR") {
      return res
        .status(403)
        .json({ error: "Only tutors can create assignments" });
    }

    const { description, publishedAt, deadline, students } = req.body;

    if (!description || !publishedAt || !deadline || !Array.isArray(students)) {
      return res.status(400).json({
        error: "description, publishedAt, deadline and students are required",
      });
    }

    const publishedAtISO = new Date(publishedAt);
    const deadlineISO = new Date(deadline);
    if (isNaN(publishedAtISO.getTime()) || isNaN(deadlineISO.getTime())) {
      return res.status(400).json({
        error:
          "Invalid date format. Use something like '12 Jan 2026 10:00 AM' or ISO string",
      });
    }

    const now = new Date();
    if (publishedAtISO <= now) {
      return res
        .status(400)
        .json({ error: "publishedAt must be a future date/time" });
    }
    if (deadlineISO <= publishedAtISO) {
      return res
        .status(400)
        .json({ error: "deadline must be later than publishedAt" });
    }

    if (students.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one student must be assigned" });
    }

    const result = await db.query(
      `INSERT INTO assignments (tutor_id, description, published_at, deadline)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, description, publishedAtISO, deadlineISO]
    );
    const assignment = result.rows[0];
    await db.query("BEGIN");
    try {
      for (const sid of students) {
        await db.query(
          `INSERT INTO assignment_students (assignment_id, student_id)
           VALUES ($1,$2)`,
          [assignment.id, sid]
        );
      }
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    res.json({
      message: "Assignment created",
      assignment: {
        id: assignment.id,
        tutor_id: assignment.tutor_id,
        description: assignment.description,
        published_at: formatPretty(assignment.published_at),
        deadline: formatPretty(assignment.deadline),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { id: userId, role } = req.user;

    if (role !== "TUTOR")
      return res.status(403).json({ error: "Only tutors allowed" });

    const { description, publishedAt, deadline, students } = req.body;
    if (!description || !publishedAt || !deadline || !Array.isArray(students)) {
      return res.status(400).json({
        error: "description, publishedAt, deadline and students are required",
      });
    }

    const publishedAtISO = new Date(publishedAt);
    const deadlineISO = new Date(deadline);
    if (isNaN(publishedAtISO.getTime()) || isNaN(deadlineISO.getTime())) {
      return res.status(400).json({
        error:
          "Invalid date format. Use something like '12 Jan 2026 10:00 AM' or ISO string",
      });
    }

    const now = new Date();

    if (publishedAtISO <= now) {
      return res
        .status(400)
        .json({ error: "publishedAt must be a future date/time" });
    }
    if (deadlineISO <= publishedAtISO) {
      return res
        .status(400)
        .json({ error: "deadline must be later than publishedAt" });
    }
    if (students.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one student must be assigned" });
    }

    const existing = await db.query("SELECT * FROM assignments WHERE id=$1", [
      assignmentId,
    ]);
    if (!existing.rows.length)
      return res.status(404).json({ error: "Assignment not found" });
    if (existing.rows[0].tutor_id !== userId)
      return res.status(403).json({ error: "Not allowed" });

    await db.query("BEGIN");
    try {
      await db.query(
        `UPDATE assignments SET description=$1, published_at=$2, deadline=$3 WHERE id=$4`,
        [description, publishedAtISO, deadlineISO, assignmentId]
      );

      await db.query("DELETE FROM assignment_students WHERE assignment_id=$1", [
        assignmentId,
      ]);
      for (const sid of students) {
        await db.query(
          `INSERT INTO assignment_students (assignment_id, student_id) VALUES ($1,$2)`,
          [assignmentId, sid]
        );
      }

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    const updated = (
      await db.query("SELECT * FROM assignments WHERE id=$1", [assignmentId])
    ).rows[0];
    res.json({
      message: "Assignment updated",
      assignment: {
        id: updated.id,
        tutor_id: updated.tutor_id,
        description: updated.description,
        published_at: formatPretty(updated.published_at),
        deadline: formatPretty(updated.deadline),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    if (req.user.role !== "TUTOR")
      return res
        .status(403)
        .json({ error: "Only tutors can delete assignments" });

    const assignmentId = Number(req.params.id);
    if (!assignmentId)
      return res.status(400).json({ error: "Invalid assignment id" });

    const a = await db.query("SELECT * FROM assignments WHERE id=$1", [
      assignmentId,
    ]);
    if (!a.rows.length)
      return res.status(404).json({ error: "Assignment not found" });
    if (a.rows[0].tutor_id !== req.user.id)
      return res.status(403).json({ error: "Not allowed" });

    await db.query("BEGIN");
    try {
      await db.query("DELETE FROM submissions WHERE assignment_id=$1", [
        assignmentId,
      ]);
      await db.query("DELETE FROM assignment_students WHERE assignment_id=$1", [
        assignmentId,
      ]);
      await db.query("DELETE FROM assignments WHERE id=$1", [assignmentId]);
      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    res.json({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.addSubmission = async (req, res) => {
  try {
    if (req.user.role !== "STUDENT")
      return res.status(403).json({ error: "Only students can submit" });

    const assignmentId = Number(req.params.id);
    const studentId = req.user.id;
    const { remark } = req.body;

    if (!assignmentId)
      return res.status(400).json({ error: "Invalid assignment id" });
    if (!remark || remark.trim() === "")
      return res.status(400).json({ error: "Remark is required" });

    const assignmentRes = await db.query(
      "SELECT * FROM assignments WHERE id=$1",
      [assignmentId]
    );
    if (!assignmentRes.rows.length)
      return res.status(404).json({ error: "Assignment not found" });

    const assignment = assignmentRes.rows[0];
    const now = new Date();
    // cannot submit before publishedAt
    if (now < new Date(assignment.published_at)) {
      return res.status(400).json({ error: "Assignment is not published yet" });
    }

    if (now > new Date(assignment.deadline)) {
      return res.status(400).json({ error: "Deadline has passed" });
    }

    const assigned = await db.query(
      `SELECT * FROM assignment_students WHERE assignment_id=$1 AND student_id=$2`,
      [assignmentId, studentId]
    );
    if (!assigned.rows.length)
      return res
        .status(403)
        .json({ error: "You are not assigned to this assignment" });

    const existing = await db.query(
      `SELECT * FROM submissions WHERE assignment_id=$1 AND student_id=$2`,
      [assignmentId, studentId]
    );
    if (existing.rows.length)
      return res.status(400).json({ error: "Already submitted" });

    const result = await db.query(
      `INSERT INTO submissions (assignment_id, student_id, remark) VALUES ($1,$2,$3) RETURNING *`,
      [assignmentId, studentId, remark]
    );
    const sub = result.rows[0];

    res.json({
      message: "Submission added",
      submission: {
        id: sub.id,
        assignment_id: sub.assignment_id,
        student_id: sub.student_id,
        remark: sub.remark,
        submitted_at: formatPretty(sub.created_at),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAssignmentDetails = async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const { id: userId, role } = req.user;

    if (!assignmentId)
      return res.status(400).json({ error: "Invalid assignment id" });

    const result = await db.query("SELECT * FROM assignments WHERE id=$1", [
      assignmentId,
    ]);
    if (!result.rows.length)
      return res.status(404).json({ error: "Assignment not found" });

    const a = result.rows[0];
    const assignment = {
      id: a.id,
      tutor_id: a.tutor_id,
      description: a.description,
      published_at: formatPretty(a.published_at),
      deadline: formatPretty(a.deadline),
    };

    if (role === "TUTOR") {
      if (a.tutor_id !== userId)
        return res.status(403).json({ error: "Unauthorized" });

      const subs = await db.query(
        `SELECT s.*, u.username FROM submissions s JOIN users u ON s.student_id=u.id WHERE s.assignment_id=$1`,
        [assignmentId]
      );

      return res.json({
        assignment,
        submissions: subs.rows.map((s) => ({
          id: s.id,
          student_id: s.student_id,
          username: s.username,
          remark: s.remark,
          submitted_at: formatPretty(s.created_at),
        })),
      });
    }

    if (role === "STUDENT") {
      const assigned = await db.query(
        `SELECT * FROM assignment_students WHERE assignment_id=$1 AND student_id=$2`,
        [assignmentId, userId]
      );
      if (!assigned.rows.length)
        return res.status(403).json({ error: "Not assigned" });

      const sub = await db.query(
        `SELECT * FROM submissions WHERE assignment_id=$1 AND student_id=$2`,
        [assignmentId, userId]
      );

      return res.json({
        assignment,
        submission: sub.rows[0]
          ? {
              id: sub.rows[0].id,
              remark: sub.rows[0].remark,
              submitted_at: formatPretty(sub.rows[0].created_at),
            }
          : null,
      });
    }

    res.status(403).json({ error: "Forbidden" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.assignmentFeed = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { publishedAt, status } = req.query;

    let assignments;
    if (role === "TUTOR") {
      assignments = await db.query(
        `SELECT * FROM assignments WHERE tutor_id=$1`,
        [userId]
      );
    } else {
      assignments = await db.query(
        `SELECT a.*, s.id AS submission_id
         FROM assignments a
         JOIN assignment_students ast ON ast.assignment_id=a.id
         LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=$1
         WHERE ast.student_id=$1`,
        [userId]
      );
    }

    const now = new Date();

    let rows = assignments.rows.map((a) => {
      const pub = new Date(a.published_at);
      const dead = new Date(a.deadline);

      let computedStatus = "";
      if (role === "TUTOR") {
        computedStatus = pub > now ? "SCHEDULED" : "ONGOING";
      } else {
        if (a.submission_id) computedStatus = "SUBMITTED";
        else if (dead < now) computedStatus = "OVERDUE";
        else computedStatus = "PENDING";
      }

      return {
        id: a.id,
        tutor_id: a.tutor_id,
        description: a.description,
        published_at: formatPretty(a.published_at),
        deadline: formatPretty(a.deadline),
        status: computedStatus,
      };
    });

    if (publishedAt === "SCHEDULED")
      rows = rows.filter((x) => x.status === "SCHEDULED");
    if (publishedAt === "ONGOING")
      rows = rows.filter((x) => x.status === "ONGOING");
    if (role === "STUDENT" && status && status !== "ALL")
      rows = rows.filter((x) => x.status === status);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
