import { connectDB, sequelize } from './src/config/db.js';

await connectDB();
await sequelize.sync();

// Delete all old call logs using correct table name
const [result] = await sequelize.query(`DELETE FROM Calls`);
console.log('✅ All old call history cleared from database.');

// Verify
const [rows] = await sequelize.query(`SELECT COUNT(*) as count FROM Calls`);
console.log(`Remaining call records: ${rows[0].count}`);

process.exit(0);
