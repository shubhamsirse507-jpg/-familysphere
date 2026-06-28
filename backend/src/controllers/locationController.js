import { User } from '../models/index.js';
import { Op } from 'sequelize';

export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.familyId) {
      return res.status(400).json({ error: 'You are not in a family' });
    }

    const now = new Date();
    user.latitude = latitude;
    user.longitude = longitude;
    user.locationSharing = true;
    user.locationUpdatedAt = now;
    await user.save();

    // Broadcast location update to family room
    const io = req.app.get('io');
    if (io) {
      io.to(`family:${user.familyId}`).emit('location:updated', {
        userId: user.id,
        name: user.name,
        profilePhoto: user.profilePhoto,
        role: user.role,
        latitude: user.latitude,
        longitude: user.longitude,
        locationUpdatedAt: user.locationUpdatedAt
      });
    }

    res.json({
      success: true,
      latitude: user.latitude,
      longitude: user.longitude,
      locationSharing: user.locationSharing,
      locationUpdatedAt: user.locationUpdatedAt
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const toggleLocationSharing = async (req, res) => {
  try {
    const { sharing } = req.body;
    if (sharing === undefined) {
      return res.status(400).json({ error: 'Sharing status is required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.familyId) {
      return res.status(400).json({ error: 'You are not in a family' });
    }

    user.locationSharing = !!sharing;
    await user.save();

    const io = req.app.get('io');
    if (io) {
      if (user.locationSharing) {
        io.to(`family:${user.familyId}`).emit('location:started', { userId: user.id });
      } else {
        io.to(`family:${user.familyId}`).emit('location:stopped', { userId: user.id });
      }
    }

    res.json({ success: true, locationSharing: user.locationSharing });
  } catch (error) {
    console.error('Toggle location sharing error:', error);
    res.status(500).json({ error: 'Failed to toggle location sharing' });
  }
};

export const getFamilyLocations = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.familyId) {
      return res.status(400).json({ error: 'You are not in a family' });
    }

    const members = await User.findAll({
      where: {
        familyId: user.familyId,
        locationSharing: true
      },
      attributes: ['id', 'name', 'profilePhoto', 'role', 'latitude', 'longitude', 'locationUpdatedAt']
    });

    res.json(members);
  } catch (error) {
    console.error('Get family locations error:', error);
    res.status(500).json({ error: 'Failed to fetch family locations' });
  }
};
