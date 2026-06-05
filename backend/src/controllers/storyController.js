import { Op } from 'sequelize';
import { Story, StoryView, User, BlockedUser } from '../models/index.js';

export const createStory = async (req, res) => {
  try {
    const { type, content, mediaUrl } = req.body;
    const userId = req.user.id;
    
    // Auto-expiry: 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const story = await Story.create({
      userId,
      type: type || 'text',
      content,
      mediaUrl,
      expiresAt,
    });
    
    const populatedStory = await Story.findByPk(story.id, {
      include: [{ model: User, attributes: ['id', 'name', 'role', 'profilePhoto'] }]
    });
    
    res.status(201).json(populatedStory);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Server error creating story' });
  }
};

export const getActiveStories = async (req, res) => {
  try {
    const userId = req.user.id;
    // Only fetch stories where expiresAt > now
    const now = new Date();
    
    // Find blocks involving the user
    const blocks = await BlockedUser.findAll({
      where: {
        [Op.or]: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    });
    const blockedUserIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    
    const whereCondition = {
      expiresAt: {
        [Op.gt]: now
      }
    };
    
    if (blockedUserIds.length > 0) {
      whereCondition.userId = {
        [Op.notIn]: blockedUserIds
      };
    }
    
    const stories = await Story.findAll({
      where: whereCondition,
      include: [
        { model: User, attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { 
          model: StoryView, 
          include: [{ model: User, attributes: ['id', 'name', 'profilePhoto'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Group stories by User to represent a shelf, similar to WhatsApp Status UI
    const groupedStories = {};
    
    stories.forEach(story => {
      const uId = story.userId;
      if (!groupedStories[uId]) {
        groupedStories[uId] = {
          user: story.User,
          stories: [],
        };
      }
      groupedStories[uId].stories.push(story);
    });
    
    res.json(Object.values(groupedStories));
  } catch (error) {
    console.error('Get active stories error:', error);
    res.status(500).json({ error: 'Server error fetching stories' });
  }
};

export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.body;
    const userId = req.user.id;
    
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Check if user has already viewed this story
    const existingView = await StoryView.findOne({
      where: { storyId, userId }
    });
    
    if (existingView) {
      return res.json(existingView);
    }
    
    const view = await StoryView.create({
      storyId,
      userId,
      viewedAt: new Date(),
    });
    
    res.status(201).json(view);
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ error: 'Server error logging story view' });
  }
};

export const reactToStory = async (req, res) => {
  try {
    const { storyId, emoji } = req.body;
    const userId = req.user.id;
    
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    let currentReactions = {};
    try {
      currentReactions = JSON.parse(story.reactions || '{}');
    } catch (e) {
      currentReactions = {};
    }
    
    if (emoji) {
      currentReactions[userId] = emoji;
    } else {
      delete currentReactions[userId];
    }
    
    story.reactions = JSON.stringify(currentReactions);
    await story.save();
    
    res.json(story);
  } catch (error) {
    console.error('React to story error:', error);
    res.status(500).json({ error: 'Server error reacting to story' });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;
    
    const story = await Story.findByPk(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    if (story.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }
    
    await story.destroy();
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Server error deleting story' });
  }
};
