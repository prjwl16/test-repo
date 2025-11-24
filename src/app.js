const express = require("express");
const app = express();

app.use(express.json());

app.use("/auth", require("./routes/auth"));
app.use("/test", require("./routes/test"));
app.use("/dbtest", require("./routes/dbtest"));
app.use("/assignments", require("./routes/assignments"));

app.get("/", (req, res) => {
  res.send("Virtual Classroom Backend Running");
});

module.exports = app;
