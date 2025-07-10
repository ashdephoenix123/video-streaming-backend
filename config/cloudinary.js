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
    const userId = req.headers["x-user-id"] || "anonymous";

    const slug = rawTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const uuid = uuidv4().slice(0, 6);
    const timestamp = Date.now();

    return {
      resource_type: "video",
      folder: `videos/${userId}`,
      public_id: `${slug}-${timestamp}-${uuid}`,
    };
  },
});

const imgStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const userId = req.user.userId || "anonymous";
    return {
      resource_type: "image",
      folder: `user-images`,
      public_id: userId,
      allowed_formats: ["jpeg", "png", "jpg", "webp"],
      transformation: [{ width: 300, height: 300, crop: "fill" }],
    };
  },
});

const upload = multer({ storage });
const uploadImage = multer({
  storage: imgStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { cloudinary, upload, uploadImage };
