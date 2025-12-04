import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { db } from './db';

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
