import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.sqlite');

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false, // Turn off logging for cleaner output
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};
