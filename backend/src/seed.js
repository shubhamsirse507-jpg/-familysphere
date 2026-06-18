import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { connectDB, sequelize } from './config/db.js';
import { Family, User, Chat, ChatMember, Message, Story, PollOption } from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CSV parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // This simple parser handles values that may contain commas inside quotes (or simple columns)
    const values = [];
    let insideQuote = false;
    let currentValue = '';
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
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
    
    if (values.length >= headers.length) {
      const entry = {};
      headers.forEach((header, index) => {
        let val = values[index];
        // Strip leading/trailing quotes if present
        if (val && val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        entry[header] = val;
      });
      results.push(entry);
    }
  }
  return results;
}

export const runSeeding = async (force = true) => {
  try {
    await connectDB();
    if (force) {
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync();
    }
    console.log('Database synced.');

    // Run migrations inside seed.js to make sure columns exist before querying User or seeding
    try {
      await sequelize.query("ALTER TABLE Memories ADD COLUMN shareType VARCHAR(255) DEFAULT 'family';");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Memories ADD COLUMN targetUserId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Memories ADD COLUMN targetChatId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Users ADD COLUMN familyId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Chats ADD COLUMN familyId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Stories ADD COLUMN familyId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Memories ADD COLUMN familyId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Posts ADD COLUMN familyId CHAR(36);");
    } catch (err) {}
    try {
      await sequelize.query("ALTER TABLE Circles ADD COLUMN familyId CHAR(36);");
    } catch (err) {}

    // Ensure seed family exists
    let seedFamily = await Family.findOne({ where: { inviteCode: 'FAMILY' } });
    if (!seedFamily) {
      seedFamily = await Family.create({
        name: 'The Singh Family',
        inviteCode: 'FAMILY'
      });
      console.log('Created seed Family: The Singh Family');
    }

    // Look for CSV in multiple locations
    const csvPath1 = path.resolve(__dirname, '../../family_members.csv');
    const csvPath2 = path.resolve(__dirname, '../family_members.csv');
    const csvPath = fs.existsSync(csvPath1) ? csvPath1 : csvPath2;

    if (!fs.existsSync(csvPath)) {
      console.error(`Error: family_members.csv not found at ${csvPath1} or ${csvPath2}`);
      return;
    }

    console.log(`Reading family data from: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsedData = parseCSV(csvContent);

    if (parsedData.length === 0) {
      console.log('No family members found in CSV file.');
      return;
    }

    const createdUsers = [];

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      if (!item.Email) continue;

      let user = await User.findOne({ where: { email: item.Email } });
      if (user) {
        // Update user fields; also update password hash if Password column is present in CSV
        user.name = item.Name || user.name;
        user.phone = item.Phone || user.phone;
        user.role = item.Role || user.role;
        user.profilePhoto = null; // No default mock profile photos
        user.familyId = seedFamily.id;
        if (item.Password) {
          user.passwordHash = await bcrypt.hash(item.Password, 10);
        }
        await user.save();
        console.log(`Updated existing user from CSV: ${user.name} (${user.role})`);
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(item.Password || 'Password123', 10);
        user = await User.create({
          name: item.Name,
          phone: item.Phone,
          email: item.Email,
          passwordHash,
          role: item.Role || 'Parent',
          profilePhoto: null, // No default mock profile photos
          familyId: seedFamily.id,
        });
        console.log(`Created new user from CSV: ${user.name} (${user.role})`);
      }
      createdUsers.push(user);
    }

    // Get or create general Family Group Chat
    let familyGroup = await Chat.findOne({ where: { name: 'The Family Sphere 🏡', isGroup: true } });
      if (!familyGroup) {
        familyGroup = await Chat.create({
          name: 'The Family Sphere 🏡',
          isGroup: true,
          avatar: null, // No default group avatar
          familyId: seedFamily.id,
        });
        console.log('Created Family Group Chat.');
      } else {
        familyGroup.familyId = seedFamily.id;
        await familyGroup.save();
      }

    // Add all members to the group chat if not already members
    for (const user of createdUsers) {
      const isMember = await ChatMember.findOne({ where: { chatId: familyGroup.id, userId: user.id } });
      if (!isMember) {
        await ChatMember.create({
          chatId: familyGroup.id,
          userId: user.id,
        });
        console.log(`Added user ${user.name} to Family Group Chat.`);
      }
    }

    // Seed some mock conversation history using first 3 users
    const [user1, user2, user3] = createdUsers;

    if (user1 && user2) {
      const msg1 = await Message.create({
        chatId: familyGroup.id,
        senderId: user1.id,
        type: 'text',
        content: `Hi everyone! Welcome to our FamilySphere! ❤️`,
      });

      const msg2 = await Message.create({
        chatId: familyGroup.id,
        senderId: user2.id,
        type: 'text',
        content: 'Looks great! So clean and fast! 🚀',
        replyToId: msg1.id,
      });

      if (user3) {
        await Message.create({
          chatId: familyGroup.id,
          senderId: user3.id,
          type: 'text',
          content: 'Let me start a poll for tonight\'s dinner!',
        });

        // Create a dinner poll
        const pollMsg = await Message.create({
          chatId: familyGroup.id,
          senderId: user3.id,
          type: 'poll',
          content: 'What should we eat tonight? 🍕🍔🍣',
        });

        // Add options for dinner using database-agnostic Sequelize bulkCreate
        await PollOption.bulkCreate([
          { messageId: pollMsg.id, optionText: 'Homemade Pizza 🍕' },
          { messageId: pollMsg.id, optionText: 'Tacos & Guac 🌮' },
          { messageId: pollMsg.id, optionText: 'Sushi Delivery 🍣' }
        ]);
      }
      console.log('Seeded initial family messages and group poll.');
    }

    // Seed status stories for first 2 users
    if (user1) {
      await Story.create({
        userId: user1.id,
        type: 'text',
        content: 'Loving the sunny weather today! ☀️🌸',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        familyId: seedFamily.id,
      });
    }
    if (user2) {
      await Story.create({
        userId: user2.id,
        type: 'text',
        content: 'Great day with the family! 🏡❤️',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        familyId: seedFamily.id,
      });
    }
    console.log('Seeded active family status stories.');

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

// Check if run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeeding(true).then(() => {
    process.exit(0);
  });
}
