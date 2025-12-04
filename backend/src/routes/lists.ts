import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import { protectedRoute } from '../middleware/auth';
import * as listsController from '../controllers/lists';

const router = Router();

// Validation schemas
const createListValidation = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description').optional().isString().trim(),
];

const updateListValidation = [
  param('id').isUUID().withMessage('Valid list ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description').optional().isString().trim(),
];

const inviteValidation = [
  param('id').isUUID().withMessage('Valid list ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role')
    .isIn(['editor', 'viewer'])
    .withMessage('Role must be editor or viewer'),
];

// Routes - all protected
router.use(protectedRoute);

// Get my lists
router.get('/me', listsController.getMyLists);

// Get pending invites for current user
router.get('/invites', listsController.getMyInvites);

// Accept an invite
router.post('/invites/:token/accept', listsController.acceptInvite);

// Decline an invite
router.post('/invites/:token/decline', listsController.declineInvite);

// Get single list
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.getListById
);

// Create list
router.post('/', createListValidation, validate, listsController.createList);

// Update list
router.patch(
  '/:id',
  updateListValidation,
  validate,
  listsController.updateList
);

// Delete list
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.deleteList
);

// Member management
router.get(
  '/:id/members',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.getMembers
);

router.delete(
  '/:id/members/:userId',
  [
    param('id').isUUID().withMessage('Valid list ID is required'),
    param('userId').isUUID().withMessage('Valid user ID is required'),
  ],
  validate,
  listsController.removeMember
);

router.patch(
  '/:id/members/:userId',
  [
    param('id').isUUID().withMessage('Valid list ID is required'),
    param('userId').isUUID().withMessage('Valid user ID is required'),
    body('role').isIn(['editor', 'viewer']).withMessage('Role must be editor or viewer'),
  ],
  validate,
  listsController.updateMemberRole
);

// Invite management
router.get(
  '/:id/invites',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.getListInvites
);

router.post('/:id/invites', inviteValidation, validate, listsController.createInvite);

router.delete(
  '/:id/invites/:inviteId',
  [
    param('id').isUUID().withMessage('Valid list ID is required'),
    param('inviteId').isUUID().withMessage('Valid invite ID is required'),
  ],
  validate,
  listsController.deleteInvite
);

// Leave list (for non-owners)
router.post(
  '/:id/leave',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.leaveList
);

export default router;
