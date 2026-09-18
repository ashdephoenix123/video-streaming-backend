const mongoose = require("mongoose");
const dns = require("node:dns");

// Fix for Windows/local ISP DNS refusing MongoDB Atlas SRV lookups (querySrv ECONNREFUSED)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    console.log("---------------- Conneting to DB ----------------");
    const connection = await mongoose.connect(process.env.MONGO_URL);
    console.log(connection.connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;
