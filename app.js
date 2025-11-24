const express = require("express");
const app = express();

app.use(express.json());

app.use("/auth", require("./src/routes/auth"));
app.use("/test", require("./src/routes/test"));
app.use("/dbtest", require("./src/routes/dbtest"));
app.use("/assignments", require("./src/routes/assignments"));

app.get("/", (req, res) => {
  res.send("Virtual Classroom Backend Running");
});

module.exports = app;
