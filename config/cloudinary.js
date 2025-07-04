const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

cloudinary.config({
  cloud_name: process.env.CLD_NAME,
  api_key: process.env.CLD_API_KEY,
  api_secret: process.env.CLD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const rawTitle = req.headers["x-title"] || "untitled";
    const slug = rawTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const uuid = uuidv4().slice(0, 6);
    const timestamp = Date.now();

    return {
      resource_type: "video",
      folder: "videos",
      public_id: `${slug}-${timestamp}-${uuid}`,
    };
  },
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
