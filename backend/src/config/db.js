import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.sqlite');

export const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
    });

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    if (process.env.DATABASE_URL) {
      console.log('PostgreSQL database connection established successfully in production.');
    } else {
      console.log('SQLite database connection established successfully.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};
