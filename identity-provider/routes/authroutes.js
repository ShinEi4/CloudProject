const express = require('express');
const { login, verifyPin } = require('../controllers/authController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Gestion de l'authentification
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
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
 *               password:
 *                 type: string
 *                 format: password
 *             example:
 *               email: testuser@example.com
 *               password: mypassword123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur connecté avec succès. Veuillez vérifier votre email pour valider votre connexion."
 *       401:
 *         description: Identifiants incorrects
 *       500:
 *         description: Erreur serveur
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/verify-pin:
 *   post:
 *     summary: Valider le code PIN pour finaliser la connexion
 *     tags: [Auth]
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
 *         description: Connexion validée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Connexion validée avec succès."
 *       400:
 *         description: Code PIN invalide ou expiré
 *       500:
 *         description: Erreur serveur
 */
router.post('/verify-pin', verifyPin);

module.exports = router;
