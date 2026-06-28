import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'video/x-msvideo', 'video/mpeg',
]);

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'familysphere/general';
    const mime = file.mimetype?.toLowerCase();
    if (req.route?.path?.includes('profile')) folder = 'familysphere/profile-photos';
    else if (req.route?.path?.includes('memor')) folder = 'familysphere/memories';
    else if (req.route?.path?.includes('post')) folder = 'familysphere/posts';
    else if (req.route?.path?.includes('stor')) folder = 'familysphere/stories';
    else if (req.route?.path?.includes('chat')) folder = 'familysphere/chat-media';
    const isVideo = mime?.startsWith('video/');
    return {
      folder,
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'],
      transformation: isVideo ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype?.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(mime)) cb(null, true);
  else cb(new Error(`File type not allowed. Received: ${mime}`), false);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 10 },
});

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Only 1 file allowed per request.' });
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
};
