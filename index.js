require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler");
const connectDB = require("./config/dbConnection");
const cookieParser = require("cookie-parser");
const { loadSecrets } = require("./config/secrets"); // <-- The secret loader

const app = express();
const port = process.env.PORT || 5000;

// --> Create the async function
const startServer = async () => {
  // --> Load secrets ONLY when not in development
  if (process.env.NODE_ENV !== "development") {
    console.log("Production environment detected, loading secrets...");
    await loadSecrets();
  } else {
    console.log("Development environment, using .env file.");
  }

  // --> Call connectDB() *after* secrets are loaded
  connectDB();

  // --> All your app logic goes inside here
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

  app.listen(port, () =>
    console.log(`Backend running on http://localhost:${port}`)
  );
};

// --> Run the async function
startServer();
