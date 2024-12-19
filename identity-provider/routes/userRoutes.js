const express = require('express');
const { registerUser, verifyPin } = require('../controllers/userController');

const router = express.Router();

router.post('/register', registerUser); // Créer un utilisateur et envoyer un code PIN
router.post('/verify-pin', verifyPin);  // Valider le code PIN

module.exports = router;
