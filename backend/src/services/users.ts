import { v4 as uuidv4 } from 'uuid';
import { User, CreateUserDto } from '@sync/shared';
import { db } from '../db';

interface UserRow {
  id: string;
  supabase_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    supabaseId: row.supabase_id || '',
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await db.query<UserRow>(`SELECT * FROM users WHERE id = $1`, [
    id,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db.query<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function getUserBySupabaseId(supabaseId: string): Promise<User | null> {
  const result = await db.query<UserRow>(
    `SELECT * FROM users WHERE supabase_id = $1`,
    [supabaseId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function createUser(data: CreateUserDto): Promise<User> {
  const id = uuidv4();
  const result = await db.query<UserRow>(
    `INSERT INTO users (id, supabase_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, data.supabaseId, data.email, data.name, data.avatarUrl || null]
  );

  return mapRowToUser(result.rows[0]);
}

export async function updateUser(
  id: string,
  updates: Partial<CreateUserDto>
): Promise<User | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${paramIndex++}`);
    values.push(updates.avatarUrl);
  }

  if (setClauses.length === 0) {
    return getUserById(id);
  }

  values.push(id);
  const result = await db.query<UserRow>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function findOrCreateUser(data: CreateUserDto): Promise<User> {
  const existing = await getUserByEmail(data.email);
  if (existing) {
    return existing;
  }
  return createUser(data);
}
