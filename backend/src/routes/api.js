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
} from '../controllers/chatController.js';
import {
  createStory,
  getActiveStories,
  viewStory,
} from '../controllers/storyController.js';
import {
  updateLocation,
  getFamilyLocations,
} from '../controllers/locationController.js';
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

// --- Story / Status Routes ---
router.post('/stories', protect, createStory);
router.get('/stories', protect, getActiveStories);
router.post('/stories/view', protect, viewStory);

// --- Location Routes ---
router.post('/location', protect, updateLocation);
router.get('/location/family', protect, getFamilyLocations);

// --- AI Routes ---
router.post('/ai/smart-replies', protect, getSmartReplies);
router.post('/ai/translate', protect, translateMessage);
router.post('/ai/voice-to-text', protect, voiceToText);
router.post('/ai/moderate', protect, moderateMessage);
router.post('/ai/assistant', protect, askAssistant);

export default router;
