import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { connectDB, sequelize } from './config/db.js';
import { User, Chat, ChatMember, Message, Location, Story } from './models/index.js';

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
    console.log(`Starting database sync (force = ${force})...`);
    await sequelize.sync({ force });
    console.log('Database synced.');

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
    // Base coordinate for the live map (New York Central Park area)
    const baseLat = 40.785091;
    const baseLng = -73.968285;

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      const passwordHash = await bcrypt.hash(item.Password || 'Password123', 10);
      
      const user = await User.create({
        name: item.Name,
        phone: item.Phone,
        email: item.Email,
        passwordHash,
        role: item.Role || 'Parent',
        profilePhoto: item.ProfilePhoto || null,
      });

      console.log(`Created user: ${user.name} (${user.role})`);
      createdUsers.push(user);

      // Create a default location nearby the base location for the interactive map
      const latOffset = (Math.random() - 0.5) * 0.015;
      const lngOffset = (Math.random() - 0.5) * 0.015;
      await Location.create({
        userId: user.id,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        isLive: true,
      });
    }

    // Create a general Family Group Chat
    const familyGroup = await Chat.create({
      name: 'The Family Sphere 🏡',
      isGroup: true,
      avatar: 'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=150', // family photo placeholder
    });

    // Add all members to the group chat
    for (const user of createdUsers) {
      await ChatMember.create({
        chatId: familyGroup.id,
        userId: user.id,
      });
    }
    console.log('Created Family Group Chat and joined all members.');

    // Seed some mock conversation history
    const mom = createdUsers.find(u => u.role === 'Parent' && u.name.includes('Mom'));
    const dad = createdUsers.find(u => u.role === 'Parent' && u.name.includes('Dad'));
    const son = createdUsers.find(u => u.role === 'Child');

    if (mom && dad && son) {
      const msg1 = await Message.create({
        chatId: familyGroup.id,
        senderId: mom.id,
        type: 'text',
        content: 'Hi family! Welcome to our new FamilySphere home! ❤️',
      });

      const msg2 = await Message.create({
        chatId: familyGroup.id,
        senderId: dad.id,
        type: 'text',
        content: 'Wow this looks great! Clean, fast, and encrypted! 🚀',
        replyToId: msg1.id,
      });

      const msg3 = await Message.create({
        chatId: familyGroup.id,
        senderId: son.id,
        type: 'text',
        content: 'Can we decide what to have for dinner? Let me make a poll.',
      });

      // Create a dinner poll
      const pollMsg = await Message.create({
        chatId: familyGroup.id,
        senderId: son.id,
        type: 'poll',
        content: 'What should we eat tonight? 🍕🍔🍣',
      });

      // Add options for dinner
      await Message.sequelize.query(
        `INSERT INTO PollOptions (id, messageId, optionText, createdAt, updatedAt) VALUES 
        (lower(hex(randomblob(16))), '${pollMsg.id}', 'Homemade Pizza 🍕', datetime('now'), datetime('now')),
        (lower(hex(randomblob(16))), '${pollMsg.id}', 'Tacos & Guac 🌮', datetime('now'), datetime('now')),
        (lower(hex(randomblob(16))), '${pollMsg.id}', 'Sushi Delivery 🍣', datetime('now'), datetime('now'))`
      );

      console.log('Seeded initial family messages and group poll.');
    }

    // Seed a couple of status updates (WhatsApp Stories)
    if (mom) {
      await Story.create({
        userId: mom.id,
        type: 'text',
        content: 'Loving the sunny weather today! ☀️🌸',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    }
    if (son) {
      await Story.create({
        userId: son.id,
        type: 'image',
        content: 'Look at my school science project! 🧪🧬',
        mediaUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
