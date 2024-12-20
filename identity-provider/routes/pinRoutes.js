const express = require('express');
const { verifyPin } = require('../controllers/pinController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Pin
 *   description: Gestion des codes PIN
 */

/**
 * @swagger
 * /api/pin/verify-pin:
 *   post:
 *     summary: Vérifier un code PIN pour finaliser une action
 *     tags: [Pin]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Code PIN validé avec succès."
 *       400:
 *         description: Code PIN invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Code PIN invalide ou expiré."
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur serveur."
 */
router.post('/verify-pin', verifyPin);

module.exports = router;
