import express from 'express';
import { body, validationResult } from 'express-validator'

import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword
} from '../controllers/authController.js'
import protect from '../middleware/auth.js'

const router = express.Router();

const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 character'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 charater')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const message = errors.array()[0].msg;

        return res.status(400).json({
            success: false,
            error: message,
            message,
            errors: errors.array().map((error) => ({
                field: error.path,
                message: error.msg,
            })),
            statusCode: 400
        });
    }

    next();
};

//public routes
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

// Protected route
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

export default router;
