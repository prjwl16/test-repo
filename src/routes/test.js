const router = require("express").Router();
const auth = require("../middleware/auth");

router.get("/protected", auth, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user
  });
});

module.exports = router;