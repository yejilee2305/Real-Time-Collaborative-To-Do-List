import dotenv from 'dotenv';
dotenv.config();

import { db } from './index';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create a demo user
    const userResult = await db.query<{ id: string }>(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['demo@example.com', 'Demo User']
    );
    const userId = userResult.rows[0].id;
    console.log('Created demo user:', userId);

    // Create a demo list
    const listResult = await db.query<{ id: string }>(
      `INSERT INTO lists (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['My First Todo List', 'A sample todo list to get started', userId]
    );
    const listId = listResult.rows[0].id;
    console.log('Created demo list:', listId);

    // Add user as owner of the list
    await db.query(
      `INSERT INTO list_members (list_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (list_id, user_id) DO NOTHING`,
      [listId, userId, 'owner']
    );

    // Create some sample todos
    const todos = [
      { title: 'Learn TypeScript', priority: 'high', position: 0 },
      { title: 'Build a real-time app', priority: 'high', position: 1 },
      { title: 'Add Socket.io integration', priority: 'medium', position: 2 },
      { title: 'Deploy to production', priority: 'low', position: 3 },
    ];

    for (const todo of todos) {
      await db.query(
        `INSERT INTO todos (list_id, title, priority, position, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [listId, todo.title, todo.priority, todo.position, userId]
      );
    }
    console.log('Created sample todos');

    console.log('✅ Seeding completed successfully');
    console.log('\n📝 Demo credentials:');
    console.log('   Email: demo@example.com');
    console.log('   List ID:', listId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
