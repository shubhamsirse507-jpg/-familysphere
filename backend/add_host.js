import bcrypt from 'bcryptjs';
import { connectDB, sequelize } from './src/config/db.js';
import { User, Chat, ChatMember } from './src/models/index.js';

await connectDB();
await sequelize.sync();

const passwordHash = await bcrypt.hash('Host@1942', 10);

try {
  const user = await User.create({
    name: 'Host',
    phone: '9158930681',
    email: 'host@family.com',
    passwordHash,
    role: 'Host',
    profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  });
  console.log(`✅ Created user: ${user.name} (${user.role}) — ${user.email}`);

  // Add to the family group chat
  const groupChat = await Chat.findOne({ where: { isGroup: true } });
  if (groupChat) {
    await ChatMember.create({ chatId: groupChat.id, userId: user.id });
    console.log(`✅ Added ${user.name} to Family Group Chat.`);
  }
} catch (err) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    console.log('⚠️  User with this email/phone already exists.');
  } else {
    console.error('Error:', err.message);
  }
}

process.exit(0);
