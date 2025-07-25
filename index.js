require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler");
const connectDB = require("./config/dbConnection");
const verifyToken = require("./middleware/verifyToken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 5000;
connectDB();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://flix-stream-azure.vercel.app"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/streams", express.static(path.join(__dirname, "streams")));
app.use("/api", require("./routes/videosRoute"));
app.use("/api/user", require("./routes/userRoute"));
app.use("/api/auth", require("./routes/auth"));
app.use(errorHandler);
app.use(verifyToken);

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
