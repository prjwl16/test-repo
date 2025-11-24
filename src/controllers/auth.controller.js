const jwt = require("jsonwebtoken");
const db = require("../config/db");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const userResult = await db.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: "User not found in DB" });
  }

  const user = userResult.rows[0];

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    "secret123",
    { expiresIn: "7d" }
  );

  res.json({
    message: "Login successful",
    token,
    user,
  });
};
