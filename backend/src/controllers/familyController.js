import { Family, User } from '../models/index.js';
import { sendAuthCookies } from './authController.js';
import { Op } from 'sequelize';

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

// ── NEW: Search any user by email or phone (cross-family) ──────────────────────
export const findUserByContact = async (req, res) => {
  try {
    const { query } = req.query; // single param — can be email OR phone
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a valid email or phone number.' });
    }

    const q = query.trim().toLowerCase();

    const found = await User.findOne({
      where: {
        [Op.or]: [
          { email: q },
          { phone: q },
        ],
      },
      attributes: ['id', 'name', 'email', 'phone', 'role', 'profilePhoto', 'familyId'],
    });

    if (!found) {
      return res.status(404).json({ error: 'No user found with that email or phone.' });
    }

    const myFamilyId = req.user.familyId;
    const theirFamilyId = found.familyId;

    let status = 'can_invite';
    if (found.id === req.user.id) {
      status = 'self';
    } else if (theirFamilyId && theirFamilyId === myFamilyId) {
      status = 'already_in_family';
    } else if (theirFamilyId && theirFamilyId !== myFamilyId) {
      status = 'in_different_family';
    }

    // Mask phone for privacy — show only last 4 digits
    const safeUser = {
      ...found.toJSON(),
      phone: found.phone ? '••••' + found.phone.slice(-4) : null,
      email: found.email, // keep email visible (they searched by it)
    };

    res.json({ user: safeUser, status });
  } catch (error) {
    console.error('Find user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// ── NEW: Pull a user (by userId) into the requester's family ──────────────────
export const inviteMemberToFamily = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const requester = await User.findByPk(req.user.id);
    if (!requester || !requester.familyId) {
      return res.status(400).json({ error: 'You must be in a family before inviting others.' });
    }
    if (!['Parent', 'Admin', 'Guardian'].includes(requester.role)) {
      return res.status(403).json({ error: 'Only a Parent, Admin, or Guardian can invite members.' });
    }

    const target = await User.findByPk(userId);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (target.familyId === requester.familyId) {
      return res.status(400).json({ error: 'This user is already in your family.' });
    }

    target.familyId = requester.familyId;
    await target.save();

    // Emit socket event so the invited user's frontend refreshes immediately
    const io = req.app.get('io');
    if (io) {
      io.to(target.id).emit('family:updated', { familyId: requester.familyId });
    }

    res.json({
      message: `${target.name} has been added to your family!`,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        profilePhoto: target.profilePhoto,
        familyId: target.familyId,
      }
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
