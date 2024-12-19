const express = require('express');
const { verifyPin } = require('../controllers/pinController');
const router = express.Router();

router.post('/verify-pin', verifyPin);

module.exports = router;
