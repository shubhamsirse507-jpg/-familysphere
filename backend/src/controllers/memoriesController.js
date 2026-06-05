/**
 * memoriesController.js
 * Handles create, read, and delete operations for the Memory model.
 * All routes are JWT-protected (req.user is set by the protect middleware).
 */

import { Memory, User } from '../models/index.js';

// GET /api/memories — Fetch all family memories (shared by all users)
export const getMemories = async (req, res) => {
  try {
    const memories = await Memory.findAll({
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'profilePhoto'],
        },
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
    const { title, description, mediaUrl, sourceType } = req.body;
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

    const memory = await Memory.create({
      userId,
      title: title.trim(),
      description: description?.trim() || '',
      mediaUrl: mediaUrl.trim(),
      sourceType: type,
    });

    // Fetch full memory with uploader info to return
    const fullMemory = await Memory.findByPk(memory.id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'profilePhoto'],
        },
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
