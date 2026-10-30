import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
 
const fileFilter = (req, file, cb) => {
  // Initial check based on client-provided mimetype (fast fail)
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, WEBP, GIF images or MP4, WEBM videos are allowed"));
  }
  cb(null, true);
};

const uploadMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

export const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      uploadMulter.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next();

        // Deep check: Verify the file's actual magic bytes if detectable
        try {
          const type = await fileTypeFromBuffer(req.file.buffer);
          if (type && !ALLOWED_MIME_TYPES.includes(type.mime)) {
            return res.status(400).json({
              message: "Invalid file content detected. Only valid images and videos are allowed.",
            });
          }
        } catch {
          // If magic bytes inspection fails, rely on client mimetype
        }
        
        next();
      });
    };
  }
};
