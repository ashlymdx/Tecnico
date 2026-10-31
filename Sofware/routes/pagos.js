import { Router } from 'express';
import { getPagos, createPago } from '../controllers/pagosController.js';

const router = Router();
router.get('/',  getPagos);
router.post('/', createPago);

export default router;