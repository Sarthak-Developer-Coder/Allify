const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const MONGO_URI = process.env.MONGO_URI;
const GENERATIVE_API_KEY = process.env.GENERATIVE_API_KEY;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

module.exports = {
  MONGO_URI,
  GENERATIVE_API_KEY,
  EMAIL,
  PASSWORD,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};
