import { Router } from 'express';
import { identify } from '../controller/identify.controller';

const router = Router();

router.post('/', identify);

export default router;
