import { Op } from 'sequelize';
import { Story, StoryView, User } from '../models/index.js';

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
    // Only fetch stories where expiresAt > now
    const now = new Date();
    
    const stories = await Story.findAll({
      where: {
        expiresAt: {
          [Op.gt]: now
        }
      },
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
