const express = require('express');
const { sendEmail } = require('../controllers/MailController');
const router = express.Router();

router.post('/send-email', sendEmail);

module.exports = router;
