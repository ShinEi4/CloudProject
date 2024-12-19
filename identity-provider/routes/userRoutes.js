const express = require('express');
const { registerUser } = require('../controllers/userController');

const router = express.Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Inscription d'un utilisateur
 *     description: Permet d'inscrire un nouvel utilisateur en envoyant un email, un nom d'utilisateur, et un mot de passe.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès.
 *       400:
 *         description: Erreur de validation.
 *       500:
 *         description: Erreur serveur.
 */
router.post('/register', registerUser);

module.exports = router;
