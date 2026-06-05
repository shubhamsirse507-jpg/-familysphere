import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// --- User Model ---
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  plainPassword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profilePhoto: {
    type: DataTypes.TEXT, // Base64 or image url
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING, // e.g. Parent, Child, Grandparent, Guardian
    defaultValue: 'Parent',
  },
  twoFactorSecret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  activeSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// --- Chat Model ---
export const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING, // Used for group chats
    allowNull: true,
  },
  isGroup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pinnedMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

// --- ChatMember Join Model ---
export const ChatMember = sequelize.define('ChatMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// --- Message Model ---
export const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING, // 'text', 'image', 'voice', 'poll', 'location'
    defaultValue: 'text',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  replyToId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

// --- MessageStatus Model (Tracking sent, delivered, read) ---
export const MessageStatus = sequelize.define('MessageStatus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  status: {
    type: DataTypes.STRING, // 'sent', 'delivered', 'read'
    defaultValue: 'sent',
  },
});

// --- PollOption Model ---
export const PollOption = sequelize.define('PollOption', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  optionText: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// --- PollVote Model ---
export const PollVote = sequelize.define('PollVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
});

// --- Story Model (Disappearing updates) ---
export const Story = sequelize.define('Story', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING, // 'text', 'image', 'video'
    defaultValue: 'text',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reactions: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
  },
});

// --- StoryView Model ---
export const StoryView = sequelize.define('StoryView', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  viewedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// --- Call Model ---
export const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING, // 'voice', 'video'
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'missed', 'completed', 'declined', 'ringing', 'active'
    defaultValue: 'ringing',
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});



// --- Memory Model (Shared family photo/video album) ---
export const Memory = sequelize.define('Memory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  mediaUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sourceType: {
    type: DataTypes.STRING, // 'local', 'googledrive', 'url'
    defaultValue: 'local',
  },
});

// --- BlockedUser Model ---
export const BlockedUser = sequelize.define('BlockedUser', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  blockerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  blockedId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

// =================== ASSOCIATIONS ===================

// Chat <-> User (Many-to-Many via ChatMember)
Chat.belongsToMany(User, { through: ChatMember, foreignKey: 'chatId' });
User.belongsToMany(Chat, { through: ChatMember, foreignKey: 'userId' });
Chat.hasMany(ChatMember, { foreignKey: 'chatId', onDelete: 'CASCADE' });
ChatMember.belongsTo(Chat, { foreignKey: 'chatId' });
User.hasMany(ChatMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
ChatMember.belongsTo(User, { foreignKey: 'userId' });

// Messages
Chat.hasMany(Message, { foreignKey: 'chatId', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId' });

User.hasMany(Message, { foreignKey: 'senderId', onDelete: 'CASCADE' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });

Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });

// MessageStatus (Track status of each message per recipient)
Message.hasMany(MessageStatus, { foreignKey: 'messageId', onDelete: 'CASCADE' });
MessageStatus.belongsTo(Message, { foreignKey: 'messageId' });
User.hasMany(MessageStatus, { foreignKey: 'userId', onDelete: 'CASCADE' });
MessageStatus.belongsTo(User, { foreignKey: 'userId' });

// Poll Options & Votes
Message.hasMany(PollOption, { foreignKey: 'messageId', onDelete: 'CASCADE' });
PollOption.belongsTo(Message, { foreignKey: 'messageId' });

PollOption.hasMany(PollVote, { foreignKey: 'pollOptionId', onDelete: 'CASCADE' });
PollVote.belongsTo(PollOption, { foreignKey: 'pollOptionId' });

User.hasMany(PollVote, { foreignKey: 'userId', onDelete: 'CASCADE' });
PollVote.belongsTo(User, { foreignKey: 'userId' });

// Stories
User.hasMany(Story, { foreignKey: 'userId', onDelete: 'CASCADE' });
Story.belongsTo(User, { foreignKey: 'userId' });

Story.hasMany(StoryView, { foreignKey: 'storyId', onDelete: 'CASCADE' });
StoryView.belongsTo(Story, { foreignKey: 'storyId' });
User.hasMany(StoryView, { foreignKey: 'userId', onDelete: 'CASCADE' });
StoryView.belongsTo(User, { foreignKey: 'userId' });

// Calls
User.hasMany(Call, { as: 'outgoingCalls', foreignKey: 'callerId', onDelete: 'CASCADE' });
Call.belongsTo(User, { as: 'caller', foreignKey: 'callerId' });
User.hasMany(Call, { as: 'incomingCalls', foreignKey: 'receiverId', onDelete: 'CASCADE' });
Call.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });
Chat.hasMany(Call, { foreignKey: 'chatId', onDelete: 'CASCADE' });
Call.belongsTo(Chat, { foreignKey: 'chatId' });


// Blocked Users
User.hasMany(BlockedUser, { as: 'blockedUsers', foreignKey: 'blockerId', onDelete: 'CASCADE' });
User.hasMany(BlockedUser, { as: 'blockedByUsers', foreignKey: 'blockedId', onDelete: 'CASCADE' });
BlockedUser.belongsTo(User, { as: 'blocker', foreignKey: 'blockerId' });
BlockedUser.belongsTo(User, { as: 'blocked', foreignKey: 'blockedId' });

// Memories
User.hasMany(Memory, { as: 'memories', foreignKey: 'userId', onDelete: 'CASCADE' });
Memory.belongsTo(User, { as: 'uploader', foreignKey: 'userId' });

// Sync database function helper
export const syncDatabase = async (force = false) => {
  await sequelize.sync({ force });
};
