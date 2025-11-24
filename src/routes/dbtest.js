// const router = require("express").Router();
// const db = require("../config/db");

// router.get("/", async (req, res) => {
//   const result = await db.query("SELECT NOW()");
//   res.json(result.rows);
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
      const r = await pool.query("SELECT NOW()");
      res.json({ ok: true, time: r.rows[0] });
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ ok: false, error: err.message, details: err });
    }
  });

module.exports = router;