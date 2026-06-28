import { Notification } from '../models/index.js';

let ioInstance = null;

export const setIoInstance = (io) => {
  ioInstance = io;
};

export const getIoInstance = () => {
  return ioInstance;
};

export const createNotification = async (userId, type, title, body, metadata = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      isRead: false,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    if (ioInstance) {
      ioInstance.to(userId).emit('notification:new', notification);
    }
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, userId: req.user.id },
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};
