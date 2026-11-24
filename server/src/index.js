import 'dotenv/config';
import { initializeDatabase } from './config/database.js';
import { createApp } from './app.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  console.error('JWT_SECRET must contain at least 24 characters');
  process.exit(1);
}

initializeDatabase();
const app = createApp();
app.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log('CampusFlow API listening'));
