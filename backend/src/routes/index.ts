import { Router } from 'express';
import todosRouter from './todos';
import listsRouter from './lists';
import usersRouter from './users';

const router = Router();

router.use('/todos', todosRouter);
router.use('/lists', listsRouter);
router.use('/users', usersRouter);

export default router;
