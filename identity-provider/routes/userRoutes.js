const express = require('express');
const { registerUser, verifyPin, resetAttempts } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser); // Créer un utilisateur et envoyer un code PIN
router.post('/verify-pin', verifyPin);  // Valider le code PIN
router.get('/reset-attempts', resetAttempts);  // Reinitialiser le nombre de tentatives

module.exports = router;
