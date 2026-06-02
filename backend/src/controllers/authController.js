import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Location, BlockedUser, Chat, ChatMember } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'familysphere_super_secret_key_12345';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password, role, profilePhoto } = req.body;
    
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const phoneExists = await User.findOne({ where: { phone } });
    if (phoneExists) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      name,
      phone,
      email,
      passwordHash,
      role: role || 'Parent',
      profilePhoto: profilePhoto || null,
    });
    
    // Create base location coordinates
    await Location.create({
      userId: user.id,
      latitude: 40.785091 + (Math.random() - 0.5) * 0.015,
      longitude: -73.968285 + (Math.random() - 0.5) * 0.015,
      isLive: true,
    });

    // Auto-join new user to all family group chats
    try {
      const groupChats = await Chat.findAll({ where: { isGroup: true } });
      for (const chat of groupChats) {
        const isMember = await ChatMember.findOne({ where: { chatId: chat.id, userId: user.id } });
        if (!isMember) {
          await ChatMember.create({ chatId: chat.id, userId: user.id });
        }
      }
    } catch (groupErr) {
      console.warn('Could not auto-join group chat:', groupErr.message);
    }
    
    res.status(201).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username or Email and password are required' });
    }
    
    const lowerIdentifier = loginIdentifier.toLowerCase();
    
    const user = await User.findOne({
      where: {
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), lowerIdentifier),
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), lowerIdentifier)
        ]
      }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username/email or password' });
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, profilePhoto, role } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (role) user.role = role;
    
    await user.save();
    
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find blocks involving the user
    const blocks = await BlockedUser.findAll({
      where: {
        [Op.or]: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    });
    
    const usersWhoBlockedMe = blocks.filter(b => b.blockedId === userId).map(b => b.blockerId);
    const usersIBlocked = new Set(blocks.filter(b => b.blockerId === userId).map(b => b.blockedId));
    
    const users = await User.findAll({
      where: {
        id: {
          [Op.notIn]: usersWhoBlockedMe
        }
      },
      attributes: ['id', 'name', 'phone', 'email', 'role', 'profilePhoto'],
    });
    
    const filteredUsers = users.map(u => {
      const uJson = u.toJSON();
      if (usersIBlocked.has(u.id)) {
        uJson.isBlocked = true;
      }
      return uJson;
    });
    
    res.json(filteredUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
