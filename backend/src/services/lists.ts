import { v4 as uuidv4 } from 'uuid';
import {
  TodoList,
  CreateListDto,
  UpdateListDto,
  ListWithMembers,
  ListMemberWithUser,
  MemberRole,
  ListInvite,
  CreateInviteDto,
} from '@sync/shared';
import { db } from '../db';
import crypto from 'crypto';

interface ListRow {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

interface MemberRow {
  id: string;
  list_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: Date;
  user_email: string;
  user_name: string;
  user_avatar_url: string | null;
}

interface InviteRow {
  id: string;
  list_id: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  status: string;
  token: string;
  expires_at: Date;
  created_at: Date;
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

function mapRowToMember(row: MemberRow): ListMemberWithUser {
  return {
    id: row.id,
    listId: row.list_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    user: {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      avatarUrl: row.user_avatar_url || undefined,
    },
  };
}

function mapRowToInvite(row: InviteRow): ListInvite {
  return {
    id: row.id,
    listId: row.list_id,
    email: row.email,
    role: row.role as MemberRole,
    invitedBy: row.invited_by,
    status: row.status as ListInvite['status'],
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
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

// Member management
export async function getListMembers(listId: string): Promise<ListMemberWithUser[]> {
  const result = await db.query<MemberRow>(
    `SELECT lm.*, u.email as user_email, u.name as user_name, u.avatar_url as user_avatar_url
     FROM list_members lm
     JOIN users u ON lm.user_id = u.id
     WHERE lm.list_id = $1
     ORDER BY lm.joined_at`,
    [listId]
  );
  return result.rows.map(mapRowToMember);
}

export async function getUserRole(listId: string, userId: string): Promise<MemberRole | null> {
  const result = await db.query<{ role: MemberRole }>(
    `SELECT role FROM list_members WHERE list_id = $1 AND user_id = $2`,
    [listId, userId]
  );
  return result.rows[0]?.role || null;
}

export async function addMember(
  listId: string,
  userId: string,
  role: MemberRole
): Promise<void> {
  await db.query(
    `INSERT INTO list_members (list_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (list_id, user_id) DO UPDATE SET role = $3`,
    [listId, userId, role]
  );
}

export async function removeMember(listId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM list_members WHERE list_id = $1 AND user_id = $2 AND role != 'owner'`,
    [listId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateMemberRole(
  listId: string,
  userId: string,
  role: MemberRole
): Promise<boolean> {
  // Can't change owner role
  if (role === 'owner') return false;

  const result = await db.query(
    `UPDATE list_members SET role = $3
     WHERE list_id = $1 AND user_id = $2 AND role != 'owner'`,
    [listId, userId, role]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getListWithMembers(
  listId: string,
  userId?: string
): Promise<ListWithMembers | null> {
  const list = await getListById(listId);
  if (!list) return null;

  const members = await getListMembers(listId);
  const userRole = userId ? await getUserRole(listId, userId) : undefined;

  return {
    ...list,
    members,
    memberCount: members.length,
    userRole: userRole || undefined,
  };
}

export async function getListsWithMembersByUserId(
  userId: string
): Promise<ListWithMembers[]> {
  const lists = await getListsByUserId(userId);

  const listsWithMembers = await Promise.all(
    lists.map(async (list) => {
      const members = await getListMembers(list.id);
      const userRole = await getUserRole(list.id, userId);
      return {
        ...list,
        members,
        memberCount: members.length,
        userRole: userRole || undefined,
      };
    })
  );

  return listsWithMembers;
}

// Invite management
export async function createInvite(
  data: CreateInviteDto,
  invitedBy: string
): Promise<ListInvite> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const result = await db.query<InviteRow>(
    `INSERT INTO list_invites (list_id, email, role, invited_by, token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (list_id, email)
     DO UPDATE SET role = $3, token = $5, expires_at = $6, status = 'pending'
     RETURNING *`,
    [data.listId, data.email.toLowerCase(), data.role, invitedBy, token, expiresAt]
  );

  return mapRowToInvite(result.rows[0]);
}

export async function getInviteByToken(token: string): Promise<ListInvite | null> {
  const result = await db.query<InviteRow>(
    `SELECT * FROM list_invites WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
    [token]
  );
  return result.rows[0] ? mapRowToInvite(result.rows[0]) : null;
}

export async function getInvitesByEmail(email: string): Promise<ListInvite[]> {
  const result = await db.query<InviteRow>(
    `SELECT * FROM list_invites
     WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [email.toLowerCase()]
  );
  return result.rows.map(mapRowToInvite);
}

export async function getInvitesByListId(listId: string): Promise<ListInvite[]> {
  const result = await db.query<InviteRow>(
    `SELECT * FROM list_invites WHERE list_id = $1 ORDER BY created_at DESC`,
    [listId]
  );
  return result.rows.map(mapRowToInvite);
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<{ success: boolean; listId?: string; error?: string }> {
  const invite = await getInviteByToken(token);
  if (!invite) {
    return { success: false, error: 'Invalid or expired invite' };
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Add user as member
    await client.query(
      `INSERT INTO list_members (list_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (list_id, user_id) DO UPDATE SET role = $3`,
      [invite.listId, userId, invite.role]
    );

    // Update invite status
    await client.query(
      `UPDATE list_invites SET status = 'accepted' WHERE id = $1`,
      [invite.id]
    );

    await client.query('COMMIT');
    return { success: true, listId: invite.listId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function declineInvite(token: string): Promise<boolean> {
  const result = await db.query(
    `UPDATE list_invites SET status = 'declined' WHERE token = $1`,
    [token]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteInvite(inviteId: string, listId: string): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM list_invites WHERE id = $1 AND list_id = $2`,
    [inviteId, listId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Permission checks
export function canEdit(role: MemberRole | null): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManageMembers(role: MemberRole | null): boolean {
  return role === 'owner';
}

export function canDelete(role: MemberRole | null): boolean {
  return role === 'owner';
}
