import { connectDB } from './backend/src/config/db.js';
import { User } from './backend/src/models/index.js';

async function check() {
  await connectDB();
  const users = await User.findAll({ attributes: ['name', 'isOnline'] });
  console.log(users.map(u => u.toJSON()));
  process.exit(0);
}
check();
