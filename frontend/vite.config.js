import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Automatically copy the uploaded logo image and generate a standard favicon.ico on server startup
try {
  const sourcePath = 'C:/Users/Shubham/.gemini/antigravity/brain/ca519a88-e1a0-4b18-8b0b-6aaee5dcde02/media__1780112284848.jpg';
  const destDir = path.resolve('public');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destPath = path.join(destDir, 'logo.png');
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log('✅ App logo copied successfully to public/logo.png');
    
    // Read the copied image and wrap it in a standard ICO header to create favicon.ico
    const imgBuffer = fs.readFileSync(destPath);
    const icoBuffer = Buffer.alloc(22 + imgBuffer.length);
    
    // ICO Header (6 bytes)
    icoBuffer.writeUInt16LE(0, 0);   // Reserved
    icoBuffer.writeUInt16LE(1, 2);   // Type: ICO (1)
    icoBuffer.writeUInt16LE(1, 4);   // Number of images (1)
    
    // Directory Entry (16 bytes)
    icoBuffer.writeUInt8(0, 6);      // Width (0 = 256px)
    icoBuffer.writeUInt8(0, 7);      // Height (0 = 256px)
    icoBuffer.writeUInt8(0, 8);      // Palette size (0 = no palette)
    icoBuffer.writeUInt8(0, 9);      // Reserved
    icoBuffer.writeUInt16LE(1, 10);  // Color planes (1)
    icoBuffer.writeUInt16LE(32, 12); // Bits per pixel (32)
    icoBuffer.writeUInt32LE(imgBuffer.length, 14); // Size of image data
    icoBuffer.writeUInt32LE(22, 18); // Offset of image data (22)
    
    // Copy image binary data
    imgBuffer.copy(icoBuffer, 22);
    
    fs.writeFileSync(path.join(destDir, 'favicon.ico'), icoBuffer);
    console.log('✅ favicon.ico generated successfully from logo asset');
  } else {
    console.warn('⚠️ Source logo file not found:', sourcePath);
  }
} catch (err) {
  console.error('❌ Failed to copy app logo or generate favicon:', err);
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
