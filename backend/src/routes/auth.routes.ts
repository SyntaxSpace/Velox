import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { registerValidator, loginValidator, refreshValidator } from '../validators/auth.validator';

const router = Router();

router.post('/register', validate(registerValidator), (req, res, next) =>
  authController.register(req, res, next),
);
router.post('/login', validate(loginValidator), (req, res, next) =>
  authController.login(req, res, next),
);
router.post('/refresh', validate(refreshValidator), (req, res, next) =>
  authController.refresh(req, res, next),
);
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

export default router;
