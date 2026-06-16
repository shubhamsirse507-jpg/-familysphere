import { MessageReaction, Message } from '../models/index.js';

export const reactToMessage = async (req, res) => {
  try {
    const { id } = req.params; // messageId
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findByPk(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const existingReaction = await MessageReaction.findOne({
      where: { messageId: id, userId }
    });

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // If same emoji, remove it
        await existingReaction.destroy();
      } else {
        // If different, update it
        existingReaction.emoji = emoji;
        await existingReaction.save();
      }
    } else {
      // Create a new reaction
      await MessageReaction.create({
        messageId: id,
        userId,
        emoji
      });
    }

    // Load all updated reactions for this message
    const reactions = await MessageReaction.findAll({
      where: { messageId: id }
    });

    // Broadcast reaction updates to everyone in the chat
    const io = req.app.get('io');
    if (io) {
      io.emit('message_reaction_updated', { messageId: id, reactions });
    }

    res.json({ success: true, reactions });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({ error: 'Failed to update message reaction' });
  }
};
