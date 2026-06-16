import { Chat, ChatMember, Message, User, PollOption, PollVote, MessageStatus, BlockedUser, MessageReaction } from '../models/index.js';
import { Op } from 'sequelize';

export const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all chats where the user is a member
    const chatMemberships = await ChatMember.findAll({
      where: { userId },
      attributes: ['chatId'],
    });
    
    const chatIds = chatMemberships.map(cm => cm.chatId);
    
    const chats = await Chat.findAll({
      where: { id: chatIds },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'phone', 'role', 'profilePhoto', 'isOnline', 'lastSeen'],
          through: { attributes: [] },
        },
        {
          model: Message,
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['name'] }],
        }
      ],
    });
    
    // Get block relationships involving the user
    const blocks = await BlockedUser.findAll({
      where: {
        [Op.or]: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    });
    const blockedUserIds = new Set(blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId));
    
    // Mask details of blocked users
    chats.forEach(chat => {
      chat.Users.forEach(u => {
        if (blockedUserIds.has(u.id)) {
          u.setDataValue('isOnline', false);
          u.setDataValue('lastSeen', null);
          u.setDataValue('profilePhoto', null);
          const isBlockedByMe = blocks.some(b => b.blockerId === userId && b.blockedId === u.id);
          u.setDataValue('isBlocked', isBlockedByMe);
          u.setDataValue('isBlockingMe', !isBlockedByMe);
        }
      });
    });
    
    // Sort chats so that chats with the latest messages appear first
    const sortedChats = chats.sort((a, b) => {
      const aTime = a.Messages?.[0]?.createdAt || a.createdAt;
      const bTime = b.Messages?.[0]?.createdAt || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    });
    
    res.json(sortedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ error: 'Server error fetching chats' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Check authorization: User must be a member of the chat
    const isMember = await ChatMember.findOne({ where: { chatId, userId } });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    const messages = await Message.findAll({
      where: { chatId },
      order: [['createdAt', 'ASC']],
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
        },
        {
          model: MessageReaction,
          attributes: ['id', 'emoji', 'userId'],
          include: [{ model: User, attributes: ['id', 'name'] }]
        }
      ]
    });
    
    // Mark these messages as read for current user
    const messageIds = messages.map(m => m.id);
    if (messageIds.length > 0) {
      await MessageStatus.update(
        { status: 'read' },
        { where: { userId, messageId: messageIds, status: { [Op.ne]: 'read' } } }
      );
    }
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
};

export const createChat = async (req, res) => {
  try {
    const { name, isGroup, participantIds, avatar } = req.body;
    const userId = req.user.id;
    
    if (isGroup) {
      if (!name) return res.status(400).json({ error: 'Group name is required' });
      
      const newGroup = await Chat.create({
        name,
        isGroup: true,
        avatar: avatar || 'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=150',
        familyId: req.user.familyId || null,
      });
      
      // Join group creator
      await ChatMember.create({ chatId: newGroup.id, userId });
      
      // Join other members
      if (participantIds && Array.isArray(participantIds)) {
        for (const pid of participantIds) {
          await ChatMember.create({ chatId: newGroup.id, userId: pid });
        }
      }
      
      const chatWithMembers = await Chat.findByPk(newGroup.id, {
        include: [{ model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] }],
      });
      
      return res.status(201).json(chatWithMembers);
    } else {
      // 1-on-1 Chat
      const targetUserId = participantIds[0];
      if (!targetUserId) return res.status(400).json({ error: 'Participant user ID required' });
      
      // Check if 1-on-1 chat already exists between these two users
      const userChats = await ChatMember.findAll({ where: { userId }, attributes: ['chatId'] });
      const targetChats = await ChatMember.findAll({ where: { userId: targetUserId }, attributes: ['chatId'] });
      
      const commonChatIds = userChats
        .map(uc => uc.chatId)
        .filter(chatId => targetChats.some(tc => tc.chatId === chatId));
      
      if (commonChatIds.length > 0) {
        // Find if any of these common chats is a 1-on-1 chat
        const existingChat = await Chat.findOne({
          where: {
            id: commonChatIds,
            isGroup: false
          },
          include: [{ model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] }],
        });
        
        if (existingChat) {
          return res.json(existingChat);
        }
      }
      
      // Create new 1-on-1 Chat
      const newChat = await Chat.create({
        isGroup: false,
        familyId: req.user.familyId || null,
      });
      await ChatMember.create({ chatId: newChat.id, userId });
      await ChatMember.create({ chatId: newChat.id, userId: targetUserId });
      
      const chatWithMembers = await Chat.findByPk(newChat.id, {
        include: [{ model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] }],
      });
      
      return res.status(201).json(chatWithMembers);
    }
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ error: 'Server error creating chat' });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.body;
    const userId = req.user.id;
    
    // Check authorization: User must be a member of the chat
    const isMember = await ChatMember.findOne({ where: { chatId, userId } });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    const chat = await Chat.findByPk(chatId);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    chat.pinnedMessageId = messageId;
    await chat.save();
    
    res.json({ message: 'Message pinned successfully', pinnedMessageId: messageId });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Server error pinning message' });
  }
};

export const votePoll = async (req, res) => {
  try {
    const { optionId } = req.body;
    const userId = req.user.id;
    
    const option = await PollOption.findByPk(optionId, {
      include: [{ model: Message, attributes: ['chatId'] }]
    });
    if (!option) {
      return res.status(404).json({ error: 'Poll option not found' });
    }
    
    // Check authorization: User must be a member of the chat this poll belongs to
    const isMember = await ChatMember.findOne({ where: { chatId: option.Message.chatId, userId } });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }
    
    // Find all options of the same poll/message to clear user's existing vote (single-select poll simulation)
    const siblingOptions = await PollOption.findAll({ where: { messageId: option.messageId } });
    const siblingOptionIds = siblingOptions.map(o => o.id);
    
    // Remove user's previous votes for options in this poll
    await PollVote.destroy({
      where: {
        userId,
        pollOptionId: siblingOptionIds,
      }
    });
    
    // Create new vote
    const vote = await PollVote.create({
      pollOptionId: optionId,
      userId,
    });
    
    res.json({ message: 'Vote registered successfully', vote });
  } catch (error) {
    console.error('Vote poll error:', error);
    res.status(500).json({ error: 'Server error casting vote' });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Check membership
    const membership = await ChatMember.findOne({ where: { chatId, userId } });
    if (!membership) {
      return res.status(403).json({ error: 'You are not authorized to delete/leave this chat' });
    }
    
    // Remove the member
    await membership.destroy();
    
    // If no members are left, delete the chat entirely
    const remainingMembers = await ChatMember.count({ where: { chatId } });
    if (remainingMembers === 0) {
      await Chat.destroy({ where: { id: chatId } });
    }
    
    res.json({ message: 'Chat removed successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Server error removing chat' });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;
    const userId = req.user.id;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check authorization: User must be a member of the chat
    const isMember = await ChatMember.findOne({ where: { chatId, userId } });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    // Search messages containing query
    const messages = await Message.findAll({
      where: {
        chatId,
        content: {
          [Op.like]: `%${q}%`
        }
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'role', 'profilePhoto'] }
      ]
    });

    res.json(messages);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Server error searching messages' });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const fullMessage = await Message.findByPk(messageId, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { 
          model: Message, 
          as: 'replyTo', 
          attributes: ['id', 'content', 'type'],
          include: [{ model: User, as: 'sender', attributes: ['name'] }]
        }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('message_updated', fullMessage);
    }

    res.json(fullMessage);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Server error editing message' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    message.content = 'This message was deleted';
    message.isDeleted = true;
    await message.save();

    const fullMessage = await Message.findByPk(messageId, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { 
          model: Message, 
          as: 'replyTo', 
          attributes: ['id', 'content', 'type'],
          include: [{ model: User, as: 'sender', attributes: ['name'] }]
        }
      ]
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('message_updated', fullMessage);
    }

    res.json(fullMessage);
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error deleting message' });
  }
};


