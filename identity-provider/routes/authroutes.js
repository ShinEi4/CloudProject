const express = require('express');
const { login,verifyPin } = require('../controllers/authController');
const router = express.Router();

router.post('/login', login);
router.post('/verify-pin', verifyPin);

module.exports = router;
