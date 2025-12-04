import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import app from './app';
import { db } from './db';
import { setupSocketServer } from './socket';

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Create HTTP server and attach Socket.io
    const httpServer = createServer(app);
    const io = setupSocketServer(httpServer);

    // Make io available to routes if needed
    app.set('io', io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server ready`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
