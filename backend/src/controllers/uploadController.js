/**
 * uploadController.js
 * Handles secure multipart/form-data file uploads via multer.
 * The actual multer middleware is applied at the route level (api.js).
 * This controller only handles post-upload logic and response.
 */

export const uploadMedia = async (req, res) => {
  try {
    // req.file is populated by multer after it processes the multipart upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided in the request.' });
    }

    // SECURITY: userId is always taken from JWT-verified token, never from body
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Build the public-accessible URL path for this file
    // Files are stored at: public/uploads/{userId}/{randomFilename}
    // Served as static at: /uploads/{userId}/{randomFilename}
    const fileUrl = `/uploads/${userId}/${req.file.filename}`;

    return res.status(200).json({
      url: fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return res.status(500).json({ error: 'Server error during file upload.' });
  }
};
