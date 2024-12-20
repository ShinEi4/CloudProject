const express = require('express');
const { initLimit, getLimit } = require('../controllers/limitController');
const router = express.Router();

// Route pour initialiser ou mettre à jour la limite
router.post('/init-limit', initLimit);

module.exports = router;
