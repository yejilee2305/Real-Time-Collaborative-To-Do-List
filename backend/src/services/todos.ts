import { v4 as uuidv4 } from 'uuid';
import { TodoItem, CreateTodoDto, UpdateTodoDto } from '@sync/shared';
import { db } from '../db';

interface TodoRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date: Date | null;
  assignee_id: string | null;
  position: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToTodo(row: TodoRow): TodoItem {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description || undefined,
    completed: row.completed,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date || undefined,
    assigneeId: row.assignee_id || undefined,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTodosByListId(listId: string): Promise<TodoItem[]> {
  const result = await db.query<TodoRow>(
    `SELECT * FROM todos WHERE list_id = $1 ORDER BY position ASC, created_at ASC`,
    [listId]
  );

  return result.rows.map(mapRowToTodo);
}

export async function getTodoById(id: string): Promise<TodoItem | null> {
  const result = await db.query<TodoRow>(`SELECT * FROM todos WHERE id = $1`, [
    id,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTodo(result.rows[0]);
}

export async function createTodo(
  data: CreateTodoDto,
  createdBy: string
): Promise<TodoItem> {
  // Get the next position for this list
  const positionResult = await db.query<{ max: number | null }>(
    `SELECT MAX(position) as max FROM todos WHERE list_id = $1`,
    [data.listId]
  );
  const nextPosition = (positionResult.rows[0].max ?? -1) + 1;

  const id = uuidv4();
  const result = await db.query<TodoRow>(
    `INSERT INTO todos (id, list_id, title, description, priority, due_date, assignee_id, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      data.listId,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.dueDate || null,
      data.assigneeId || null,
      nextPosition,
      createdBy,
    ]
  );

  return mapRowToTodo(result.rows[0]);
}

export async function updateTodo(
  id: string,
  updates: UpdateTodoDto
): Promise<TodoItem | null> {
  // Build dynamic update query
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.completed !== undefined) {
    setClauses.push(`completed = $${paramIndex++}`);
    values.push(updates.completed);
    // Also update status when completed changes
    if (updates.status === undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.completed ? 'completed' : 'pending');
    }
  }
  if (updates.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex++}`);
    values.push(updates.priority);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.dueDate !== undefined) {
    setClauses.push(`due_date = $${paramIndex++}`);
    values.push(updates.dueDate);
  }
  if (updates.assigneeId !== undefined) {
    setClauses.push(`assignee_id = $${paramIndex++}`);
    values.push(updates.assigneeId);
  }
  if (updates.position !== undefined) {
    setClauses.push(`position = $${paramIndex++}`);
    values.push(updates.position);
  }

  if (setClauses.length === 0) {
    return getTodoById(id);
  }

  values.push(id);
  const result = await db.query<TodoRow>(
    `UPDATE todos SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTodo(result.rows[0]);
}

export async function deleteTodo(id: string): Promise<boolean> {
  const result = await db.query(`DELETE FROM todos WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleTodo(id: string): Promise<TodoItem | null> {
  const result = await db.query<TodoRow>(
    `UPDATE todos
     SET completed = NOT completed,
         status = CASE WHEN completed THEN 'pending' ELSE 'completed' END
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTodo(result.rows[0]);
}

export async function reorderTodo(
  id: string,
  newPosition: number
): Promise<TodoItem | null> {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Get the current todo
    const currentResult = await client.query<TodoRow>(
      `SELECT * FROM todos WHERE id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentTodo = currentResult.rows[0];
    const oldPosition = currentTodo.position;

    if (oldPosition === newPosition) {
      await client.query('ROLLBACK');
      return mapRowToTodo(currentTodo);
    }

    // Shift other todos
    if (newPosition > oldPosition) {
      // Moving down: shift items between old and new position up
      await client.query(
        `UPDATE todos
         SET position = position - 1
         WHERE list_id = $1 AND position > $2 AND position <= $3`,
        [currentTodo.list_id, oldPosition, newPosition]
      );
    } else {
      // Moving up: shift items between new and old position down
      await client.query(
        `UPDATE todos
         SET position = position + 1
         WHERE list_id = $1 AND position >= $2 AND position < $3`,
        [currentTodo.list_id, newPosition, oldPosition]
      );
    }

    // Update the todo's position
    const result = await client.query<TodoRow>(
      `UPDATE todos SET position = $1 WHERE id = $2 RETURNING *`,
      [newPosition, id]
    );

    await client.query('COMMIT');

    return mapRowToTodo(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
