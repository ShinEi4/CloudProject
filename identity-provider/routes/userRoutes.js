const express = require('express');
const { getAllUsers, createUser } = require('../controllers/userController');

const router = express.Router();

router.get('/', getAllUsers);     // GET /api/users : Récupérer tous les utilisateurs
router.post('/', createUser);     // POST /api/users : Créer un utilisateur

module.exports = router;
