
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const materialRoutes = require("./routes/materialRoutes");
const tutorRoutes = require("./routes/tutorRoutes");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/materials", materialRoutes);
app.use("/api/tutor", tutorRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Learnora Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend connected successfully"
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Learnora backend running on http://localhost:${PORT}`);
});
