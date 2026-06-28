import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.js';
import {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  getAllUsers,
  validateSignup,
  validateLogin,
} from '../controllers/authController.js';
import {
  getChats,
  getMessages,
  createChat,
  pinMessage,
  votePoll,
  deleteChat,
  searchMessages,
  editMessage,
  deleteMessage,
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

import { setup2FA, verify2FA, disable2FA } from '../controllers/twoFactorController.js';
import { getPosts, createPost, deletePost, likePost, addComment } from '../controllers/postController.js';
import { reactToMessage } from '../controllers/reactionController.js';
import { getCircles, createCircle, joinCircle, deleteCircle } from '../controllers/circleController.js';
import { createFamily, joinFamily, getMyFamily, findUserByContact, inviteMemberToFamily, sendInvite, acceptInvite, rejectInvite, getPendingInvites } from '../controllers/familyController.js';

const router = express.Router();

// --- Auth Routes ---
router.post('/auth/signup', validateSignup, signup);
router.post('/auth/login', validateLogin, login);
router.post('/auth/logout', logout);
router.get('/auth/profile', protect, getProfile);
router.put('/auth/profile', protect, updateProfile);
router.get('/auth/users', protect, getAllUsers);

// --- Family Routes ---
router.post('/family/create', protect, createFamily);
router.post('/family/join', protect, joinFamily);
router.get('/family/me', protect, getMyFamily);
router.post('/family/invite-member', protect, inviteMemberToFamily);
router.post('/family/send-invite', protect, sendInvite);
router.post('/family/accept-invite', protect, acceptInvite);
router.post('/family/reject-invite', protect, rejectInvite);
router.get('/family/pending-invites', protect, getPendingInvites);

const findUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: { error: 'Too many search attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- User Search (cross-family, by email/phone) ---
router.get('/users/find', protect, findUserLimiter, findUserByContact);

// --- Chat Routes ---
router.get('/chats', protect, getChats);
router.get('/chats/:chatId/messages', protect, getMessages);
router.post('/chats', protect, createChat);
router.post('/chats/pin', protect, pinMessage);
router.post('/chats/vote', protect, votePoll);
router.delete('/chats/:chatId', protect, deleteChat);
router.get('/chats/:chatId/search', protect, searchMessages);
router.put('/chats/:chatId/messages/:messageId', protect, editMessage);
router.delete('/chats/:chatId/messages/:messageId', protect, deleteMessage);

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

// --- 2FA Routes ---
router.post('/auth/2fa/setup', protect, setup2FA);
router.post('/auth/2fa/verify', protect, verify2FA);
router.post('/auth/2fa/disable', protect, disable2FA);

// --- Feed Posts Routes ---
router.get('/posts', protect, getPosts);
router.post('/posts', protect, createPost);
router.delete('/posts/:id', protect, deletePost);
router.post('/posts/:id/like', protect, likePost);
router.post('/posts/:id/comment', protect, addComment);

// --- Message Reaction Routes ---
router.post('/messages/:id/react', protect, reactToMessage);

// --- Circles Routes ---
router.get('/circles', protect, getCircles);
router.post('/circles', protect, createCircle);
router.post('/circles/:id/join', protect, joinCircle);
router.delete('/circles/:id', protect, deleteCircle);



// --- AI Routes ---
router.post('/ai/smart-replies', protect, getSmartReplies);
router.post('/ai/translate', protect, translateMessage);
router.post('/ai/voice-to-text', protect, voiceToText);
router.post('/ai/moderate', protect, moderateMessage);
router.post('/ai/assistant', protect, askAssistant);

export default router;
