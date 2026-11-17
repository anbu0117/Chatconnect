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

/**
 * Safely deletes an asset from Cloudinary by public ID or Cloudinary URL.
 */
export const deleteMediaFromCloudinary = async (mediaUrl, mediaType = "image", explicitPublicId = null) => {
  try {
    if (!isCloudinaryConfigured()) return;

    let publicId = explicitPublicId;

    if (!publicId && mediaUrl && typeof mediaUrl === "string" && mediaUrl.includes("cloudinary.com")) {
      const urlParts = mediaUrl.split("/upload/");
      if (urlParts.length > 1) {
        let pathAfterUpload = urlParts[1];
        // Strip version prefix if present, e.g. v1680000000/
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, "");
        // Strip file extension
        const dotIdx = pathAfterUpload.lastIndexOf(".");
        publicId = dotIdx !== -1 ? pathAfterUpload.substring(0, dotIdx) : pathAfterUpload;
      }
    }

    if (publicId) {
      const resourceType = mediaType === "video" ? "video" : "image";
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return result;
    }
  } catch (err) {
    console.warn("[Cloudinary Delete Warning]", err.message);
  }
};
