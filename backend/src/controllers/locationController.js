import { Location, User } from '../models/index.js';

export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, isLive } = req.body;
    const userId = req.user.id;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    let location = await Location.findOne({ where: { userId } });
    
    if (location) {
      location.latitude = latitude;
      location.longitude = longitude;
      if (isLive !== undefined) location.isLive = isLive;
      await location.save();
    } else {
      location = await Location.create({
        userId,
        latitude,
        longitude,
        isLive: isLive !== undefined ? isLive : true,
      });
    }
    
    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Server error updating location' });
  }
};

export const getFamilyLocations = async (req, res) => {
  try {
    // Only return live coordinates of family members
    const locations = await Location.findAll({
      where: { isLive: true },
      include: [{ model: User, attributes: ['id', 'name', 'role', 'profilePhoto'] }],
    });
    
    res.json(locations);
  } catch (error) {
    console.error('Get family locations error:', error);
    res.status(500).json({ error: 'Server error fetching locations' });
  }
};
