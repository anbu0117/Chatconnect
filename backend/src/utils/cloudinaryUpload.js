import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";

/**
 * Uploads an in-memory file buffer (from multer memoryStorage) to Cloudinary
 * using an upload stream, so we never need to write temp files to disk.
 */
export const uploadBufferToCloudinary = (buffer, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          "Cloudinary credentials are missing or placeholder. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your Render environment variables."
        )
      );
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error("[Cloudinary upload_stream error]", error);
          return reject(error);
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};
