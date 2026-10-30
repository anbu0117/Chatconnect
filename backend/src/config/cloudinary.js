import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cleanEnv = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, "") : "");

const cloudName = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
const apiKey = cleanEnv(process.env.CLOUDINARY_API_KEY);
const apiSecret = cleanEnv(process.env.CLOUDINARY_API_SECRET);
const cloudinaryUrl = cleanEnv(process.env.CLOUDINARY_URL);

if (cloudinaryUrl && !cloudinaryUrl.includes("your_")) {
  cloudinary.config({
    cloudinary_url: cloudinaryUrl,
  });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Returns true if valid, non-placeholder Cloudinary credentials are provided.
 */
export const isCloudinaryConfigured = () => {
  if (cloudinaryUrl && !cloudinaryUrl.includes("your_")) {
    return true;
  }
  if (!cloudName || !apiKey || !apiSecret) return false;
  if (
    apiKey.toLowerCase().includes("your") ||
    cloudName.toLowerCase().includes("your") ||
    apiSecret.toLowerCase().includes("your")
  ) {
    return false;
  }
  return true;
};

export default cloudinary;
