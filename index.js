require("dotenv").config(); // This is still fine for local development
const express = require("express");
const cors = require("cors");
const path = require("path");
const { errorHandler } = require("./middleware/errorHandler");
const connectDB = require("./config/dbConnection");
const cookieParser = require("cookie-parser");
const { loadSecrets } = require("./config/secrets"); // --> 1. Import your loader

const app = express();
const port = process.env.PORT || 5000;

// --> 2. Create a new async function to run the app
const startServer = async () => {
  // --> 3. Load secrets *before* doing anything else
  // Only load from GCP when in production (or when NOT in development)
  if (process.env.NODE_ENV !== "development") {
    await loadSecrets();
  }

  // --> 4. Now, call connectDB() *after* secrets are loaded
  connectDB();

  // --> 5. All of your original app.use() logic goes inside here
  app.use(
    cors({
      origin: ["http://localhost:3000", "https://flix-stream-azure.vercel.app"],
      credentials: true,
    })
  );

  // --> 6. Added the preflight handler we discussed for CORS
  app.options(
    "*",
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

// --> 7. Run the new async function to start the server
startServer();
