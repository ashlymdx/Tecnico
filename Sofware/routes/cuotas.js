import { Router } from 'express';
import { getCuotas, getCuotaById, updateCuota } from '../controllers/cuotasController.js';

const router = Router();
router.get('/',    getCuotas);
router.get('/:id', getCuotaById);
router.put('/:id', updateCuota);

export default router;