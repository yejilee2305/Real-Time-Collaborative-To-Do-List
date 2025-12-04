import { Request, Response, NextFunction } from 'express';
import {
  ApiResponse,
  TodoList,
  CreateListDto,
  UpdateListDto,
  ListWithMembers,
  ListMemberWithUser,
  ListInvite,
  MemberRole,
} from '@sync/shared';
import * as listsService from '../services/lists';
import { AppError } from '../middleware/errorHandler';

// Get my lists (authenticated user's lists)
export async function getMyLists(
  req: Request,
  res: Response<ApiResponse<ListWithMembers[]>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const lists = await listsService.getListsWithMembersByUserId(req.user.id);

    res.json({
      success: true,
      data: lists,
    });
  } catch (error) {
    next(error);
  }
}

// Get list by ID with permission check
export async function getListById(
  req: Request,
  res: Response<ApiResponse<ListWithMembers>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const list = await listsService.getListWithMembers(id, req.user.id);

    if (!list) {
      throw new AppError(404, 'List not found');
    }

    // Check if user has access
    if (!list.userRole) {
      throw new AppError(403, 'You do not have access to this list');
    }

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

// Create a new list
export async function createList(
  req: Request,
  res: Response<ApiResponse<TodoList>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const listData: CreateListDto = req.body;
    const list = await listsService.createList(listData, req.user.id);

    res.status(201).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

// Update a list
export async function updateList(
  req: Request,
  res: Response<ApiResponse<TodoList>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const updates: UpdateListDto = req.body;

    // Check permission
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canEdit(role)) {
      throw new AppError(403, 'You do not have permission to edit this list');
    }

    const list = await listsService.updateList(id, updates);

    if (!list) {
      throw new AppError(404, 'List not found');
    }

    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
}

// Delete a list
export async function deleteList(
  req: Request,
  res: Response<ApiResponse<{ id: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;

    // Only owner can delete
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canDelete(role)) {
      throw new AppError(403, 'Only the owner can delete this list');
    }

    const deleted = await listsService.deleteList(id);

    if (!deleted) {
      throw new AppError(404, 'List not found');
    }

    res.json({
      success: true,
      data: { id },
      message: 'List deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// Get list members
export async function getMembers(
  req: Request,
  res: Response<ApiResponse<ListMemberWithUser[]>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;

    // Check if user has access to this list
    const role = await listsService.getUserRole(id, req.user.id);
    if (!role) {
      throw new AppError(403, 'You do not have access to this list');
    }

    const members = await listsService.getListMembers(id);

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

// Remove a member
export async function removeMember(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id, userId } = req.params;

    // Only owner can remove members
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canManageMembers(role)) {
      throw new AppError(403, 'Only the owner can remove members');
    }

    const removed = await listsService.removeMember(id, userId);

    res.json({
      success: true,
      data: { success: removed },
    });
  } catch (error) {
    next(error);
  }
}

// Update member role
export async function updateMemberRole(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id, userId } = req.params;
    const { role: newRole } = req.body as { role: MemberRole };

    // Only owner can change roles
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canManageMembers(role)) {
      throw new AppError(403, 'Only the owner can change member roles');
    }

    const updated = await listsService.updateMemberRole(id, userId, newRole);

    res.json({
      success: true,
      data: { success: updated },
    });
  } catch (error) {
    next(error);
  }
}

// Leave a list
export async function leaveList(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;

    // Check role - owners cannot leave their own list
    const role = await listsService.getUserRole(id, req.user.id);
    if (role === 'owner') {
      throw new AppError(400, 'Owners cannot leave their own list. Transfer ownership or delete the list.');
    }

    const removed = await listsService.removeMember(id, req.user.id);

    res.json({
      success: true,
      data: { success: removed },
    });
  } catch (error) {
    next(error);
  }
}

// Get pending invites for a list
export async function getListInvites(
  req: Request,
  res: Response<ApiResponse<ListInvite[]>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;

    // Only owner can see invites
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canManageMembers(role)) {
      throw new AppError(403, 'Only the owner can view invites');
    }

    const invites = await listsService.getInvitesByListId(id);

    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    next(error);
  }
}

// Create an invite
export async function createInvite(
  req: Request,
  res: Response<ApiResponse<ListInvite>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = req.params;
    const { email, role: inviteRole } = req.body as { email: string; role: MemberRole };

    // Only owner can invite
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canManageMembers(role)) {
      throw new AppError(403, 'Only the owner can invite members');
    }

    const invite = await listsService.createInvite(
      { listId: id, email, role: inviteRole },
      req.user.id
    );

    res.status(201).json({
      success: true,
      data: invite,
    });
  } catch (error) {
    next(error);
  }
}

// Delete an invite
export async function deleteInvite(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id, inviteId } = req.params;

    // Only owner can delete invites
    const role = await listsService.getUserRole(id, req.user.id);
    if (!listsService.canManageMembers(role)) {
      throw new AppError(403, 'Only the owner can delete invites');
    }

    const deleted = await listsService.deleteInvite(inviteId, id);

    res.json({
      success: true,
      data: { success: deleted },
    });
  } catch (error) {
    next(error);
  }
}

// Get my pending invites
export async function getMyInvites(
  req: Request,
  res: Response<ApiResponse<ListInvite[]>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const invites = await listsService.getInvitesByEmail(req.user.email);

    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    next(error);
  }
}

// Accept an invite
export async function acceptInvite(
  req: Request,
  res: Response<ApiResponse<{ listId: string }>>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { token } = req.params;
    const result = await listsService.acceptInvite(token, req.user.id);

    if (!result.success) {
      throw new AppError(400, result.error || 'Failed to accept invite');
    }

    res.json({
      success: true,
      data: { listId: result.listId! },
    });
  } catch (error) {
    next(error);
  }
}

// Decline an invite
export async function declineInvite(
  req: Request,
  res: Response<ApiResponse<{ success: boolean }>>,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params;
    const declined = await listsService.declineInvite(token);

    res.json({
      success: true,
      data: { success: declined },
    });
  } catch (error) {
    next(error);
  }
}
