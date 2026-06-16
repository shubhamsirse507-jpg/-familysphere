import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'familysphere_super_secret_key_12345';

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies ? req.cookies.token : null;
    
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Not authorized, token missing' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is still active (single-device enforcement)
    if (decoded.sessionId) {
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'activeSessionId']
      });
      
      if (!user || user.activeSessionId !== decoded.sessionId) {
        return res.status(401).json({ 
          error: 'Session expired. You have been logged in from another device.',
          code: 'SESSION_REPLACED'
        });
      }
    }
    
    req.user = decoded; // Contains id, email, role, name, sessionId
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};
