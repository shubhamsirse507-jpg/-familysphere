import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, BlockedUser, Chat, ChatMember } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'familysphere_super_secret_key_12345';

const generateToken = (user, sessionId) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, sessionId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const appendUserToCSV = (name, phone, email, password, role, profilePhoto) => {
  try {
    const csvPath = path.resolve(__dirname, '../../../family_members.csv');
    let content = '';
    if (fs.existsSync(csvPath)) {
      content = fs.readFileSync(csvPath, 'utf8');
    } else {
      content = 'Name,Phone,Email,Password,Role,ProfilePhoto\n';
      fs.writeFileSync(csvPath, content, 'utf8');
    }
    
    const suffix = (content.endsWith('\n') || content.endsWith('\r')) ? '' : '\n';
    
    const escapeCsv = (str) => {
      if (!str) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };
    
    const newLine = `${escapeCsv(name)},${escapeCsv(phone)},${escapeCsv(email)},${escapeCsv(password)},${escapeCsv(role)},${escapeCsv(profilePhoto || '')}\n`;
    fs.appendFileSync(csvPath, suffix + newLine, 'utf8');
    console.log(`[Developer Log] Appended user ${name} to family_members.csv`);
  } catch (err) {
    console.error('Error appending user to CSV:', err.message);
  }
};

const updateUserInCSV = (email, updatedData) => {
  try {
    const csvPath = path.resolve(__dirname, '../../../family_members.csv');
    if (!fs.existsSync(csvPath)) return;
    
    let content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const emailIndex = headers.indexOf('Email');
    if (emailIndex === -1) return;
    
    const escapeCsv = (str) => {
      if (!str) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };
    
    const updatedLines = lines.map((line, idx) => {
      if (idx === 0) return line;
      
      const values = [];
      let insideQuote = false;
      let currentValue = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      let rowEmail = values[emailIndex] || '';
      if (rowEmail.startsWith('"') && rowEmail.endsWith('"')) {
        rowEmail = rowEmail.substring(1, rowEmail.length - 1);
      }
      
      if (rowEmail.toLowerCase() === email.toLowerCase()) {
        return headers.map(h => {
          let val = '';
          if (h === 'Name') val = updatedData.name !== undefined ? updatedData.name : (values[headers.indexOf('Name')] || '');
          else if (h === 'Phone') val = updatedData.phone !== undefined ? updatedData.phone : (values[headers.indexOf('Phone')] || '');
          else if (h === 'Email') val = email;
          else if (h === 'Password') val = values[headers.indexOf('Password')] || '';
          else if (h === 'Role') val = updatedData.role !== undefined ? updatedData.role : (values[headers.indexOf('Role')] || '');
          else if (h === 'ProfilePhoto') val = updatedData.profilePhoto !== undefined ? updatedData.profilePhoto : (values[headers.indexOf('ProfilePhoto')] || '');
          else val = values[headers.indexOf(h)] || '';
          
          if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          }
          return escapeCsv(val);
        }).join(',');
      }
      return line;
    });
    
    fs.writeFileSync(csvPath, updatedLines.join('\n') + '\n', 'utf8');
    console.log(`[Developer Log] Updated user ${email} in family_members.csv`);
  } catch (err) {
    console.error('Error updating user in CSV:', err.message);
  }
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
      plainPassword: password,
      role: role || 'Parent',
      profilePhoto: profilePhoto || null,
    });
    
    // Automatically log the new user details in plain text to family_members.csv for developer visibility
    appendUserToCSV(name, phone, email, password, role || 'Parent', profilePhoto);

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
    
    // Generate unique session ID and save to user
    const sessionId = crypto.randomUUID();
    user.activeSessionId = sessionId;
    await user.save();

    res.status(201).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user, sessionId),
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
    
    // Generate unique session ID — invalidates any previous session
    const sessionId = crypto.randomUUID();
    user.activeSessionId = sessionId;
    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user, sessionId),
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

    // Sync updates to family_members.csv
    updateUserInCSV(user.email, { name, phone, role, profilePhoto });
    
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto,
      token: generateToken(user, req.user.sessionId),
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
