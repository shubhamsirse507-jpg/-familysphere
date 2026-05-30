import fs from 'fs';
import path from 'path';

export const uploadMedia = async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    // Clean base64 data (remove headers like "data:image/png;base64,")
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let dataBuffer;
    let cleanFilename = filename || 'upload.png';
    
    if (matches && matches.length === 3) {
      const type = matches[1];
      const extension = type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1];
      dataBuffer = Buffer.from(matches[2], 'base64');
      if (!filename) {
        cleanFilename = `media_${Date.now()}.${extension}`;
      }
    } else {
      dataBuffer = Buffer.from(base64Data, 'base64');
    }
    
    const uploadDir = path.resolve('public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, cleanFilename);
    fs.writeFileSync(filePath, dataBuffer);
    
    const fileUrl = `/uploads/${cleanFilename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ error: 'Server error uploading file' });
  }
};
