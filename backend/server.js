const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const materialRoutes = require("./routes/materialRoutes");

app.use(cors());
app.use(express.json());
app.use("/api/materials", materialRoutes);

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
