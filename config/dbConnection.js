const mongoose = require("mongoose");

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
