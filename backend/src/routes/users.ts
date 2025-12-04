import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';
import * as usersController from '../controllers/users';

const router = Router();

// Validation schemas
const createUserValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Valid user ID is required'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be a valid URL'),
];

// Routes
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Valid user ID is required')],
  validate,
  usersController.getUserById
);

router.post('/', createUserValidation, validate, usersController.createUser);

router.patch('/:id', updateUserValidation, validate, usersController.updateUser);

// Get or create user by email (useful for auth)
router.post(
  '/find-or-create',
  createUserValidation,
  validate,
  usersController.findOrCreateUser
);

export default router;
