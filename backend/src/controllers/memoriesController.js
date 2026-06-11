import { Memory, User, Chat, ChatMember } from '../models/index.js';
import { Op } from 'sequelize';

// GET /api/memories — Fetch family memories based on sharing permissions
export const getMemories = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Find all chats where the user is a member
    const chatMemberships = await ChatMember.findAll({
      where: { userId },
      attributes: ['chatId'],
    });
    const chatIds = chatMemberships.map(cm => cm.chatId);

    const memories = await Memory.findAll({
      where: {
        [Op.or]: [
          { shareType: 'family' },
          { shareType: null }, // Handle existing/historical database records
          { userId },
          { targetUserId: userId },
          {
            [Op.and]: [
              { shareType: 'chat' },
              { targetChatId: { [Op.in]: chatIds } }
            ]
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'profilePhoto'],
        },
        {
          model: User,
          as: 'sharedWith',
          attributes: ['id', 'name', 'profilePhoto'],
        },
        {
          model: Chat,
          as: 'sharedChat',
          attributes: ['id', 'name', 'isGroup'],
        }
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(memories);
  } catch (error) {
    console.error('Get memories error:', error);
    return res.status(500).json({ error: 'Failed to fetch memories.' });
  }
};

// POST /api/memories — Create a new memory
export const createMemory = async (req, res) => {
  try {
    const { title, description, mediaUrl, sourceType, shareType, targetUserId, targetChatId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Memory title is required.' });
    }
    if (!mediaUrl || !mediaUrl.trim()) {
      return res.status(400).json({ error: 'A media URL is required.' });
    }

    // Validate sourceType
    const validSourceTypes = ['local', 'googledrive', 'url'];
    const type = validSourceTypes.includes(sourceType) ? sourceType : 'local';

    // Validate shareType
    const validShareTypes = ['family', 'individual', 'chat'];
    const sType = validShareTypes.includes(shareType) ? shareType : 'family';

    const memory = await Memory.create({
      userId,
      title: title.trim(),
      description: description?.trim() || '',
      mediaUrl: mediaUrl.trim(),
      sourceType: type,
      shareType: sType,
      targetUserId: sType === 'individual' ? targetUserId : null,
      targetChatId: sType === 'chat' ? targetChatId : null,
    });

    // Fetch full memory with uploader/recipient info to return
    const fullMemory = await Memory.findByPk(memory.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'profilePhoto'],
        },
        {
          model: User,
          as: 'sharedWith',
          attributes: ['id', 'name', 'profilePhoto'],
        },
        {
          model: Chat,
          as: 'sharedChat',
          attributes: ['id', 'name', 'isGroup'],
        }
      ],
    });

    return res.status(201).json(fullMemory);
  } catch (error) {
    console.error('Create memory error:', error);
    return res.status(500).json({ error: 'Failed to create memory.' });
  }
};

// DELETE /api/memories/:memoryId — Delete a memory (owner only)
export const deleteMemory = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const userId = req.user?.id;

    const memory = await Memory.findByPk(memoryId);
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found.' });
    }

    // SECURITY: Only the owner can delete their memory
    if (memory.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: you can only delete your own memories.' });
    }

    await memory.destroy();
    return res.status(200).json({ message: 'Memory deleted successfully.' });
  } catch (error) {
    console.error('Delete memory error:', error);
    return res.status(500).json({ error: 'Failed to delete memory.' });
  }
};
