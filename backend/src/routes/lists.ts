import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
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
  body('ownerId').isUUID().withMessage('Valid owner ID is required'),
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

// Routes
router.get('/', listsController.getLists);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.getListById
);

router.post('/', createListValidation, validate, listsController.createList);

router.patch(
  '/:id',
  updateListValidation,
  validate,
  listsController.updateList
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Valid list ID is required')],
  validate,
  listsController.deleteList
);

// Get lists for a specific user
router.get(
  '/user/:userId',
  [param('userId').isUUID().withMessage('Valid user ID is required')],
  validate,
  listsController.getListsByUser
);

export default router;
