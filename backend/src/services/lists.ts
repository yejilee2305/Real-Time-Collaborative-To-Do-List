import { v4 as uuidv4 } from 'uuid';
import { TodoList, CreateListDto, UpdateListDto } from '@sync/shared';
import { db } from '../db';

interface ListRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToList(row: ListRow): TodoList {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllLists(): Promise<TodoList[]> {
  const result = await db.query<ListRow>(
    `SELECT * FROM lists ORDER BY created_at DESC`
  );
  return result.rows.map(mapRowToList);
}

export async function getListById(id: string): Promise<TodoList | null> {
  const result = await db.query<ListRow>(`SELECT * FROM lists WHERE id = $1`, [
    id,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToList(result.rows[0]);
}

export async function getListsByUserId(userId: string): Promise<TodoList[]> {
  const result = await db.query<ListRow>(
    `SELECT l.* FROM lists l
     INNER JOIN list_members lm ON l.id = lm.list_id
     WHERE lm.user_id = $1
     ORDER BY l.created_at DESC`,
    [userId]
  );

  return result.rows.map(mapRowToList);
}

export async function createList(
  data: CreateListDto,
  ownerId: string
): Promise<TodoList> {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const id = uuidv4();
    const result = await client.query<ListRow>(
      `INSERT INTO lists (id, name, description, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, data.name, data.description || null, ownerId]
    );

    // Add owner as a member
    await client.query(
      `INSERT INTO list_members (list_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [id, ownerId]
    );

    await client.query('COMMIT');

    return mapRowToList(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateList(
  id: string,
  updates: UpdateListDto
): Promise<TodoList | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (setClauses.length === 0) {
    return getListById(id);
  }

  values.push(id);
  const result = await db.query<ListRow>(
    `UPDATE lists SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToList(result.rows[0]);
}

export async function deleteList(id: string): Promise<boolean> {
  const result = await db.query(`DELETE FROM lists WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
