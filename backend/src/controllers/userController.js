import { User, BlockedUser } from '../models/index.js';
import { Op } from 'sequelize';

export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;
    
    if (!blockedId) {
      return res.status(400).json({ error: 'Blocked user ID is required' });
    }
    
    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }
    
    // Check if user to block exists
    const userToBlock = await User.findByPk(blockedId);
    if (!userToBlock) {
      return res.status(404).json({ error: 'User to block not found' });
    }
    
    // Create block record
    const [block, created] = await BlockedUser.findOrCreate({
      where: { blockerId, blockedId }
    });
    
    res.json({ message: 'User blocked successfully', block });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Server error blocking user' });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;
    
    if (!blockedId) {
      return res.status(400).json({ error: 'Blocked user ID is required' });
    }
    
    await BlockedUser.destroy({
      where: { blockerId, blockedId }
    });
    
    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Server error unblocking user' });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const blocks = await BlockedUser.findAll({
      where: { blockerId },
      include: [{ 
        model: User, 
        as: 'blocked', 
        attributes: ['id', 'name', 'email', 'phone', 'role', 'profilePhoto'] 
      }]
    });
    res.json(blocks.map(b => b.blocked).filter(Boolean));
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Server error fetching blocked users' });
  }
};
