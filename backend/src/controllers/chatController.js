import { Chat, ChatMember, Message, User, PollOption, PollVote, MessageStatus } from '../models/index.js';

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
          attributes: ['id', 'name', 'email', 'phone', 'role', 'profilePhoto'],
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
        }
      ]
    });
    
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
      
      const commonChat = userChats.find(uc => targetChats.some(tc => tc.chatId === uc.chatId));
      
      if (commonChat) {
        // Double check it's a 1-to-1 chat, not a group chat
        const existingChat = await Chat.findByPk(commonChat.chatId, {
          include: [{ model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] }],
        });
        if (!existingChat.isGroup) {
          return res.json(existingChat);
        }
      }
      
      // Create new 1-on-1 Chat
      const newChat = await Chat.create({ isGroup: false });
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
    
    const option = await PollOption.findByPk(optionId);
    if (!option) {
      return res.status(404).json({ error: 'Poll option not found' });
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
