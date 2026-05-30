import { Call, User } from '../models/index.js';
import { Op } from 'sequelize';

export const createCallLog = async (req, res) => {
  try {
    const { receiverId, type, status, chatId } = req.body;
    const callerId = req.user.id;
    
    if (!receiverId || !type) {
      return res.status(400).json({ error: 'Receiver ID and call type are required' });
    }
    
    const call = await Call.create({
      callerId,
      receiverId,
      chatId: chatId || null,
      type,
      status: status || 'ringing',
      startedAt: status === 'connected' ? new Date() : null
    });
    
    const fullCall = await Call.findByPk(call.id, {
      include: [
        { model: User, as: 'caller', attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'role', 'profilePhoto'] }
      ]
    });
    
    res.status(201).json(fullCall);
  } catch (error) {
    console.error('Create call log error:', error);
    res.status(500).json({ error: 'Server error creating call log' });
  }
};

export const updateCallLog = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    
    call.status = status;
    if (status === 'connected') {
      call.startedAt = new Date();
    } else if (status === 'completed' || status === 'declined' || status === 'missed') {
      call.endedAt = new Date();
    }
    
    await call.save();
    
    const fullCall = await Call.findByPk(call.id, {
      include: [
        { model: User, as: 'caller', attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'role', 'profilePhoto'] }
      ]
    });
    
    res.json(fullCall);
  } catch (error) {
    console.error('Update call log error:', error);
    res.status(500).json({ error: 'Server error updating call log' });
  }
};

export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const calls = await Call.findAll({
      where: {
        [Op.or]: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      include: [
        { model: User, as: 'caller', attributes: ['id', 'name', 'role', 'profilePhoto'] },
        { model: User, as: 'receiver', attributes: ['id', 'name', 'role', 'profilePhoto'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(calls);
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Server error fetching call history' });
  }
};
