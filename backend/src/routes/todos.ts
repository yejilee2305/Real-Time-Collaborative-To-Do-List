import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import * as todosController from '../controllers/todos';

const router = Router();

// Validation schemas
const createTodoValidation = [
  body('listId').isUUID().withMessage('Valid list ID is required'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('description').optional().isString().trim(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate').optional().isISO8601().toDate(),
  body('assigneeId').optional().isUUID(),
];

const updateTodoValidation = [
  param('id').isUUID().withMessage('Valid todo ID is required'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('description').optional().isString().trim(),
  body('completed').optional().isBoolean(),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),
  body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  body('assigneeId').optional({ nullable: true }).isUUID(),
  body('position').optional().isInt({ min: 0 }),
];

// Routes
router.get(
  '/',
  [query('listId').isUUID().withMessage('Valid list ID is required')],
  validate,
  todosController.getTodos
);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid todo ID is required')],
  validate,
  todosController.getTodoById
);

router.post('/', createTodoValidation, validate, todosController.createTodo);

router.patch(
  '/:id',
  updateTodoValidation,
  validate,
  todosController.updateTodo
);

router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Valid todo ID is required')],
  validate,
  todosController.deleteTodo
);

router.patch(
  '/:id/toggle',
  [param('id').isUUID().withMessage('Valid todo ID is required')],
  validate,
  todosController.toggleTodo
);

router.patch(
  '/:id/reorder',
  [
    param('id').isUUID().withMessage('Valid todo ID is required'),
    body('position')
      .isInt({ min: 0 })
      .withMessage('Position must be a non-negative integer'),
  ],
  validate,
  todosController.reorderTodo
);

export default router;
