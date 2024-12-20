const express = require('express');
const { initSessionDuration } = require('../controllers/dureesessionController');
const router = express.Router();

router.post('/init-session-duration', initSessionDuration);

module.exports = router;
