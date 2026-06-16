import { Circle, User, CircleMember } from '../models/index.js';
import { familyWhere } from '../utils/family.js';

export const getCircles = async (req, res) => {
  try {
    const circles = await Circle.findAll({
      where: familyWhere(req),
      include: [
        { model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'profilePhoto', 'role'] }
      ]
    });
    res.json(circles);
  } catch (error) {
    console.error('Get circles error:', error);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
};

export const createCircle = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Circle name is required' });
    }

    const circle = await Circle.create({
      name,
      description: description || null,
      icon: icon || '⭕',
      creatorId: req.user.id,
      familyId: req.user.familyId || null
    });

    // Auto-join creator as admin member
    await CircleMember.create({
      circleId: circle.id,
      userId: req.user.id,
      role: 'admin'
    });

    const fullCircle = await Circle.findByPk(circle.id, {
      include: [
        { model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'profilePhoto', 'role'] }
      ]
    });

    // Broadcast new circle via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('circle_created', fullCircle);
    }

    res.status(201).json(fullCircle);
  } catch (error) {
    console.error('Create circle error:', error);
    res.status(500).json({ error: 'Failed to create circle' });
  }
};

export const joinCircle = async (req, res) => {
  try {
    const { id } = req.params; // circleId
    const userId = req.user.id;

    const circle = await Circle.findOne({
      where: { id, ...familyWhere(req) }
    });
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    const existingMember = await CircleMember.findOne({
      where: { circleId: id, userId }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member of this circle' });
    }

    await CircleMember.create({
      circleId: id,
      userId,
      role: 'member'
    });

    const fullCircle = await Circle.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name', 'profilePhoto', 'role'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'profilePhoto', 'role'] }
      ]
    });

    // Broadcast circle update via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('circle_member_joined', { circleId: id, fullCircle });
    }

    res.json(fullCircle);
  } catch (error) {
    console.error('Join circle error:', error);
    res.status(500).json({ error: 'Failed to join circle' });
  }
};

export const deleteCircle = async (req, res) => {
  try {
    const { id } = req.params;
    const circle = await Circle.findOne({
      where: { id, ...familyWhere(req) }
    });
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }

    if (circle.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this circle' });
    }

    await circle.destroy();

    // Broadcast circle deleted event
    const io = req.app.get('io');
    if (io) {
      io.emit('circle_deleted', { id });
    }

    res.json({ success: true, message: 'Circle deleted successfully' });
  } catch (error) {
    console.error('Delete circle error:', error);
    res.status(500).json({ error: 'Failed to delete circle' });
  }
};
