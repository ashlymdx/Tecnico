import { Router } from 'express';
import {
  getNotificaciones, marcarLeida, createNotificacion,
} from '../controllers/notificacionesController.js';

const router = Router();
router.get('/',            getNotificaciones);
router.post('/',           createNotificacion);
router.patch('/:id/leida', marcarLeida);

export default router;