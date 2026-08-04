import cloudinary from "../config/cloudinary.js";

/**
 * Uploads an in-memory file buffer (from multer memoryStorage) to Cloudinary
 * using an upload stream, so we never need to write temp files to disk.
 */
export const uploadBufferToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};
