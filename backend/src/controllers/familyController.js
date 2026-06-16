import { Family, User } from '../models/index.js';
import { sendAuthCookies } from './authController.js';

const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createFamily = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Family name is required' });
    }

    let inviteCode;
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < 10) {
      inviteCode = generateInviteCode();
      const existing = await Family.findOne({ where: { inviteCode } });
      if (!existing) {
        codeExists = false;
      }
      attempts++;
    }

    if (codeExists) {
      return res.status(500).json({ error: 'Could not generate a unique invite code. Please try again.' });
    }

    const family = await Family.create({ name, inviteCode });

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.familyId = family.id;
    await user.save();

    // Re-issue cookies with new familyId in JWT
    sendAuthCookies(res, user, req.user.sessionId);

    // Emit socket event 'family:updated' to this user's socket room
    const io = req.app.get('io');
    if (io) {
      io.to(user.id).emit('family:updated', { familyId: family.id });
    }

    res.status(201).json({
      family,
      inviteCode
    });
  } catch (error) {
    console.error('Create family error:', error);
    res.status(500).json({ error: 'Server error creating family' });
  }
};

export const joinFamily = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const family = await Family.findOne({
      where: {
        inviteCode: inviteCode.trim().toUpperCase()
      }
    });

    if (!family) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.familyId = family.id;
    await user.save();

    // Re-issue cookies with new familyId in JWT
    sendAuthCookies(res, user, req.user.sessionId);

    // Emit socket event 'family:updated' to this user's socket room
    const io = req.app.get('io');
    if (io) {
      io.to(user.id).emit('family:updated', { familyId: family.id });
    }

    res.json({
      message: 'Successfully joined the family',
      family
    });
  } catch (error) {
    console.error('Join family error:', error);
    res.status(500).json({ error: 'Server error joining family' });
  }
};

export const getMyFamily = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || !user.familyId) {
      return res.status(404).json({ error: 'Family not found or user is not in a family' });
    }

    const family = await Family.findByPk(user.familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json(family);
  } catch (error) {
    console.error('Get my family error:', error);
    res.status(500).json({ error: 'Server error fetching family details' });
  }
};
