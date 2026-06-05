import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';

import { connectDB, sequelize } from './config/db.js';
import apiRoutes from './routes/api.js';
import { Message, User, Chat, ChatMember, PollOption, PollVote, BlockedUser, MessageStatus, Memory } from './models/index.js';
import { runSeeding } from './seed.js';
import { requireAdmin } from './middleware/adminAuth.js';
import { showLogin, processLogin, logout, showDashboard, downloadCSV } from './controllers/adminController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS allowed for all origins in development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'familysphere_super_secret_key_12345';

// Socket.io JWT Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify session is still active (single-device enforcement)
    if (decoded.sessionId) {
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'activeSessionId']
      });
      if (!user || user.activeSessionId !== decoded.sessionId) {
        return next(new Error('Session replaced by another device'));
      }
    }
    
    socket.user = decoded;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup API Routes
app.use('/api', apiRoutes);

// =======================================================
// Admin Dashboard Routes (Developer-Only, Password Protected)
// =======================================================
app.get('/admin', (req, res) => res.redirect('/admin/login'));
app.get('/admin/login', showLogin);
app.post('/admin/login', processLogin);
app.get('/admin/logout', logout);
app.get('/admin/dashboard', requireAdmin, showDashboard);
app.get('/admin/download', requireAdmin, downloadCSV);

// Server static files (e.g. for uploads or frontend builds)
app.use(express.static(path.join(__dirname, '../public')));

// Root Endpoint
app.get('/', (req, res) => {
  res.send('FamilySphere API Server is running.');
});

// Create AI Assistant virtual user if it does not exist
const ensureAIUser = async () => {
  try {
    let aiUser = await User.findOne({ where: { role: 'AI' } });
    if (!aiUser) {
      aiUser = await User.create({
        name: 'FamilySphere AI 🤖',
        email: 'ai@familysphere.com',
        phone: '+0000000000',
        passwordHash: 'ai_virtual_account_hashed_secret',
        role: 'AI',
        profilePhoto: 'https://ui-avatars.com/api/?name=AI&background=818cf8&color=fff',
      });
      console.log('Virtual AI Assistant user created.');
    }
    
    // Auto join AI User to all group chats so it can answer queries starting with "@ai"
    const groupChats = await Chat.findAll({ where: { isGroup: true } });
    for (const chat of groupChats) {
      const isMember = await ChatMember.findOne({ where: { chatId: chat.id, userId: aiUser.id } });
      if (!isMember) {
        await ChatMember.create({ chatId: chat.id, userId: aiUser.id });
      }
    }
  } catch (err) {
    console.error('Error ensuring AI User:', err);
  }
};

// Broadcast live active user count to all connected clients
const broadcastActiveUsers = async () => {
  try {
    const activeUsers = await User.findAll({
      where: { isOnline: true },
      attributes: ['id', 'name', 'role', 'profilePhoto'],
    });
    io.emit('active_users_update', {
      count: activeUsers.length,
      users: activeUsers.map(u => u.toJSON()),
    });
  } catch (err) {
    console.error('Error broadcasting active users:', err);
  }
};

// Real-time communication via Socket.io
io.on('connection', (socket) => {
  // console.log(`Socket connected: ${socket.id}`);

  // User authenticates/joins their personal room to receive notifications/calls
  socket.on('auth', async (userId) => {
    socket.join(userId);
    socket.userId = userId;
    
    try {
      await User.update({ isOnline: true, lastSeen: null }, { where: { id: userId } });
      io.emit('user_status_changed', { userId, isOnline: true, lastSeen: null });
      await broadcastActiveUsers();
    } catch (err) {
      console.error('Error updating user online status:', err);
    }
  });

  // User joins a specific chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
  });

  // User leaves a chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
  });

  // Mark chat as read
  socket.on('mark_chat_read', async (data) => {
    const { chatId, userId } = data;
    try {
      const messages = await Message.findAll({ where: { chatId }, attributes: ['id'] });
      const messageIds = messages.map(m => m.id);
      if (messageIds.length > 0) {
        await MessageStatus.update(
          { status: 'read' },
          { where: { userId, messageId: messageIds, status: { [Op.ne]: 'read' } } }
        );
      }
      io.to(chatId).emit('messages_read', { chatId, userId });
    } catch (err) {
      console.error('Error marking chat read via socket:', err);
    }
  });

  // Mark chat as delivered
  socket.on('mark_chat_delivered', async (data) => {
    const { chatId, userId } = data;
    try {
      const messages = await Message.findAll({ where: { chatId }, attributes: ['id'] });
      const messageIds = messages.map(m => m.id);
      if (messageIds.length > 0) {
        await MessageStatus.update(
          { status: 'delivered' },
          { where: { userId, messageId: messageIds, status: 'sent' } }
        );
      }
      io.to(chatId).emit('messages_delivered', { chatId, userId });
    } catch (err) {
      console.error('Error marking chat delivered via socket:', err);
    }
  });

  // Send real-time chat message
  socket.on('send_message', async (data) => {
    const { chatId, senderId, content, type, mediaUrl, replyToId, pollOptions } = data;
    
    try {
      // Enforce Authorization: Check if sender is a member of the chat
      const chatMembers = await ChatMember.findAll({ where: { chatId } });
      const isMember = chatMembers.some(cm => cm.userId === senderId);
      if (!isMember) {
        console.warn(`Unauthorized message attempt from ${senderId} in chat ${chatId}`);
        return;
      }

      // Check block status (1-to-1 chats only)
      const currentChat = await Chat.findByPk(chatId, {
        include: [{ model: User, attributes: ['id'] }],
      });
      
      if (!currentChat) return;
      
      if (!currentChat.isGroup) {
        const partner = currentChat.Users.find(u => u.id !== senderId);
        if (partner) {
          const blockExists = await BlockedUser.findOne({
            where: {
              [Op.or]: [
                { blockerId: partner.id, blockedId: senderId },
                { blockerId: senderId, blockedId: partner.id }
              ]
            }
          });
          if (blockExists) {
            console.warn(`Blocked message attempt between ${senderId} and ${partner.id}`);
            return;
          }
        }
      }

      // 1. Moderate message for family safety (local check)
      const toxicKeywords = ['hate', 'stupid', 'jerk', 'shut up', 'damn', 'kill', 'abuse', 'fuck', 'shit'];
      let moderatedContent = content;
      let wasToxic = false;
      const lowerText = content ? content.toLowerCase() : '';
      
      for (const word of toxicKeywords) {
        if (lowerText.includes(word)) {
          wasToxic = true;
          const regex = new RegExp(word, 'gi');
          moderatedContent = moderatedContent.replace(regex, '❤️🌸');
        }
      }

      // 2. Save Message in Database
      const message = await Message.create({
        chatId,
        senderId,
        type: type || 'text',
        content: moderatedContent,
        mediaUrl,
        replyToId,
      });

      // If poll, save options
      if (type === 'poll' && pollOptions && Array.isArray(pollOptions)) {
        for (const opt of pollOptions) {
          await PollOption.create({
            messageId: message.id,
            optionText: opt,
          });
        }
      }

      // Create MessageStatus entries for all other chat members
      for (const member of chatMembers) {
        if (member.userId !== senderId) {
          const recipientSockets = await io.in(member.userId).fetchSockets();
          const status = recipientSockets.length > 0 ? 'delivered' : 'sent';
          await MessageStatus.create({
            messageId: message.id,
            userId: member.userId,
            status,
          });
        }
      }

      // Fetch complete message object
      const fullMessage = await Message.findByPk(message.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'name', 'role', 'profilePhoto'] },
          { 
            model: Message, 
            as: 'replyTo', 
            attributes: ['id', 'content', 'type'],
            include: [{ model: User, as: 'sender', attributes: ['name'] }]
          },
          { 
            model: PollOption,
            include: [{ model: PollVote, include: [{ model: User, attributes: ['id', 'name'] }] }]
          },
          {
            model: MessageStatus,
            attributes: ['userId', 'status']
          }
        ]
      });

      // Broadcast message to everyone in the chat room (including sender)
      io.to(chatId).emit('new_message', fullMessage);

      // 3. AI Assistant Response Generation (if applicable)
      const aiUser = await User.findOne({ where: { role: 'AI' } });
      const isDirectAiChat = !currentChat.isGroup && currentChat.Users.some(u => u.role === 'AI');
      const mentionsAi = content && (content.toLowerCase().includes('@ai') || content.toLowerCase().startsWith('ai '));

      if (aiUser && senderId !== aiUser.id && (isDirectAiChat || mentionsAi)) {
        // Send a typing status for AI
        io.to(chatId).emit('typing', { chatId, userId: aiUser.id, isTyping: true });

        setTimeout(async () => {
          let aiPrompt = content;
          if (mentionsAi) {
            aiPrompt = content.replace(/@ai/gi, '').replace(/^ai\s+/gi, '').trim();
          }

          let aiReplyContent = "I am FamilySphere AI, your family helper! I can assist you with dinner planning, scheduling chores, dividing tasks, and providing smart suggestions. How can I support your family today? ❤️";
          const lowerPrompt = aiPrompt.toLowerCase();
          
          if (lowerPrompt.includes('dinner') || lowerPrompt.includes('recipe') || lowerPrompt.includes('eat')) {
            aiReplyContent = "🍽️ **Dinner Suggestion:** How about a healthy taco night? It's interactive and fun for kids and grandparents alike! You will need:\n- Tortillas\n- Ground beef or black beans\n- Avocados, tomatoes, and salsa\n- Cheese and sour cream\nWould you like me to make a shopping list for this? 🛒";
          } else if (lowerPrompt.includes('chore') || lowerPrompt.includes('clean') || lowerPrompt.includes('task')) {
            aiReplyContent = "🧹 **Family Chore Organizer:** I recommend setting up a weekly rotation system. For example:\n- **Samiksha:** Kitchen duty & grocery shopping\n- **Varsha:** Cleaning & organizing living spaces\n- **Vijay:** Outdoor tasks & maintenance\n- **Host:** Coordinating schedules & reminders\nI can create a visual chart or send reminders to keep everyone on track! Would you like me to help draft a chore calendar?";
          } else if (lowerPrompt.includes('schedule') || lowerPrompt.includes('event') || lowerPrompt.includes('calendar')) {
            aiReplyContent = "📅 **Schedule Helper:** I can track upcoming events for Samiksha, Varsha, Vijay, and Host. I can set automatic alerts inside our family group chat to keep everyone aligned! Let me know what event you would like to schedule next.";
          } else if (lowerPrompt.includes('joke')) {
            aiReplyContent = "😄 Here is a family-friendly joke:\n\n*Why did the computer go to the doctor?*\n*Because it had a virus!* 💻🩺";
          } else if (lowerPrompt.includes('help') || lowerPrompt.includes('capabilities')) {
            aiReplyContent = "🌟 **Here is what I can do for you:**\n1. **Chore Division**: Help divide housework fairly.\n2. **Meal Planning**: Suggest delicious recipes and write shopping lists.\n3. **Event Reminders**: Keep track of soccer matches, doctor visits, and birthdays.\n4. **Conflict Resolution**: Neutral advice on family matters.\nFeel free to ask me anything!";
          }

          // Save AI response message
          const aiMessage = await Message.create({
            chatId,
            senderId: aiUser.id,
            type: 'text',
            content: aiReplyContent,
            replyToId: message.id,
          });

          // Create status for AI message
          for (const member of chatMembers) {
            if (member.userId !== aiUser.id) {
              const recipientSockets = await io.in(member.userId).fetchSockets();
              const status = recipientSockets.length > 0 ? 'delivered' : 'sent';
              await MessageStatus.create({
                messageId: aiMessage.id,
                userId: member.userId,
                status,
              });
            }
          }

          const fullAiMessage = await Message.findByPk(aiMessage.id, {
            include: [
              { model: User, as: 'sender', attributes: ['id', 'name', 'role', 'profilePhoto'] },
              { 
                model: Message, 
                as: 'replyTo', 
                attributes: ['id', 'content', 'type'],
                include: [{ model: User, as: 'sender', attributes: ['name'] }]
              },
              {
                model: MessageStatus,
                attributes: ['userId', 'status']
              }
            ]
          });

          // Stop typing indicator and send AI message
          io.to(chatId).emit('typing', { chatId, userId: aiUser.id, isTyping: false });
          io.to(chatId).emit('new_message', fullAiMessage);

        }, 1200);
      }

    } catch (error) {
      console.error('Socket message save error:', error);
    }
  });

  // Typing status updates
  socket.on('typing', (data) => {
    const { chatId, userId, isTyping } = data;
    socket.to(chatId).emit('typing', { chatId, userId, isTyping });
  });



  // --- WebRTC Peer-to-Peer Calls Signaling ---
  socket.on('call_user', async (data) => {
    const { userToCall, signalData, fromUser, type, chatId, dbId } = data;
    
    try {
      // Block checks for calls
      const blockExists = await BlockedUser.findOne({
        where: {
          [Op.or]: [
            { blockerId: userToCall, blockedId: fromUser.id },
            { blockerId: fromUser.id, blockedId: userToCall }
          ]
        }
      });
      if (blockExists) {
        socket.emit('call_declined');
        return;
      }
      
      // Notify the target user of incoming call
      io.to(userToCall).emit('incoming_call', {
        signal: signalData,
        from: fromUser,
        type,
        chatId,
        dbId,
      });
    } catch (err) {
      console.error('Call block check error:', err);
    }
  });

  socket.on('accept_call', (data) => {
    const { toUser, signalData } = data;
    io.to(toUser).emit('call_accepted', signalData);
  });

  socket.on('decline_call', (data) => {
    const { toUser } = data;
    io.to(toUser).emit('call_declined');
  });

  socket.on('end_call', (data) => {
    const { toUser } = data;
    io.to(toUser).emit('call_ended');
  });

  socket.on('webrtc_ice', (data) => {
    const { toUser, candidate } = data;
    io.to(toUser).emit('webrtc_ice', { candidate });
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      try {
        const activeSockets = await io.in(userId).fetchSockets();
        if (activeSockets.length === 0) {
          const lastSeen = new Date();
          await User.update({ isOnline: false, lastSeen }, { where: { id: userId } });
          io.emit('user_status_changed', { userId, isOnline: false, lastSeen });
          await broadcastActiveUsers();
        }
      } catch (err) {
        console.error('Error on disconnect presence update:', err);
      }
    }
  });
});

// Initialize DB and Seed default data on startup
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    // Connect SQLite DB
    await connectDB();
    
    // Auto sync tables and run incremental seed from CSV to sync any missing users
    const dbExists = fs.existsSync(path.resolve(__dirname, '../database.sqlite'));
    if (!dbExists) {
      console.log('Database file not found. Running seed script with full CSV import...');
      await runSeeding(true);
    } else {
      console.log('Database file exists. Syncing tables and running incremental CSV sync...');
      await runSeeding(false);
    }

    // Clear old calls history to ensure no references to removed users (Mom, Dad, Son) remain
    try {
      await sequelize.query('DELETE FROM Calls');
      console.log('✅ All old call history cleared from database on startup.');
    } catch (callClearErr) {
      console.error('Error clearing old calls:', callClearErr);
    }
    
    // Ensure AI profile is in DB
    await ensureAIUser();

    server.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(`🚀 FamilySphere Backend Server running on Port ${PORT}`);
      console.log(`🏠 Mode: Development (SQLite database)`);
      console.log(`===================================================`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

startServer();
