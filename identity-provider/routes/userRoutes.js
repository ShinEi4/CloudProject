const express = require('express');
const { registerUser, verifyPin, resetAttempts, updateUser } = require('../controllers/userController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Créer un utilisateur et envoyer un code PIN
 *     tags: [Users]
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
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *             example:
 *               username: testuser
 *               email: testuser@example.com
 *               password: mypassword123
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /api/users/verify-pin:
 *   post:
 *     summary: Valider un code PIN
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               codePin:
 *                 type: string
 *             example:
 *               email: testuser@example.com
 *               codePin: "1234"
 *     responses:
 *       200:
 *         description: Code PIN validé avec succès
 *       400:
 *         description: Code PIN invalide ou expiré
 *       500:
 *         description: Erreur serveur
 */
router.post('/verify-pin', verifyPin);

/**
 * @swagger
 * /api/users/reset-attempts:
 *   get:
 *     summary: Réinitialiser les tentatives échouées
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Tentatives échouées réinitialisées
 *       500:
 *         description: Erreur serveur
 */
router.get('/reset-attempts', resetAttempts);

/**
 * @swagger
 * /api/users/update:
 *   put:
 *     summary: Mettre à jour les informations d'un utilisateur
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nouveau nom d'utilisateur
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Nouveau email de l'utilisateur
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nouveau mot de passe
 *             example:
 *               username: updateduser
 *               email: updateduser@example.com
 *               password: updatedpassword123
 *     responses:
 *       200:
 *         description: Informations utilisateur mises à jour avec succès
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.put('/update', updateUser);

module.exports = router;
