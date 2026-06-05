import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  signup,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
} from '../controllers/authController.js';
import {
  getChats,
  getMessages,
  createChat,
  pinMessage,
  votePoll,
  deleteChat,
} from '../controllers/chatController.js';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/userController.js';
import { uploadMedia } from '../controllers/uploadController.js';
import { uploadMiddleware, handleUploadError } from '../middleware/upload.js';
import { getMemories, createMemory, deleteMemory } from '../controllers/memoriesController.js';
import { createCallLog, updateCallLog, getCallHistory } from '../controllers/callController.js';
import {
  createStory,
  getActiveStories,
  viewStory,
  reactToStory,
  deleteStory,
} from '../controllers/storyController.js';

import {
  getSmartReplies,
  translateMessage,
  voiceToText,
  moderateMessage,
  askAssistant,
} from '../controllers/aiController.js';

const router = express.Router();

// --- Auth Routes ---
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.get('/auth/profile', protect, getProfile);
router.put('/auth/profile', protect, updateProfile);
router.get('/auth/users', protect, getAllUsers);

// --- Chat Routes ---
router.get('/chats', protect, getChats);
router.get('/chats/:chatId/messages', protect, getMessages);
router.post('/chats', protect, createChat);
router.post('/chats/pin', protect, pinMessage);
router.post('/chats/vote', protect, votePoll);
router.delete('/chats/:chatId', protect, deleteChat);

// --- User Management / Blocks ---
router.post('/users/block', protect, blockUser);
router.post('/users/unblock', protect, unblockUser);
router.get('/users/blocked', protect, getBlockedUsers);

// --- Media Upload (multer secured: whitelist MIME, size cap, per-user dir) ---
router.post('/upload', protect, uploadMiddleware.single('file'), handleUploadError, uploadMedia);

// --- Memories Routes ---
router.get('/memories', protect, getMemories);
router.post('/memories', protect, createMemory);
router.delete('/memories/:memoryId', protect, deleteMemory);

// --- Call Log Routes ---
router.post('/calls', protect, createCallLog);
router.put('/calls/:callId', protect, updateCallLog);
router.get('/calls', protect, getCallHistory);

// --- Story / Status Routes ---
router.post('/stories', protect, createStory);
router.get('/stories', protect, getActiveStories);
router.post('/stories/view', protect, viewStory);
router.post('/stories/react', protect, reactToStory);
router.delete('/stories/:storyId', protect, deleteStory);



// --- AI Routes ---
router.post('/ai/smart-replies', protect, getSmartReplies);
router.post('/ai/translate', protect, translateMessage);
router.post('/ai/voice-to-text', protect, voiceToText);
router.post('/ai/moderate', protect, moderateMessage);
router.post('/ai/assistant', protect, askAssistant);

export default router;
