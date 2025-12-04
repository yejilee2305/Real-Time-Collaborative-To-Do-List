import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { db } from './index';

async function migrate() {
  console.log('🔄 Running database migrations...');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await db.query(schema);

    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
