const express = require('express');
const { initSessionDuration } = require('../controllers/dureesessionController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SessionDuration
 *   description: Gestion des durées de session
 */

/**
 * @swagger
 * /api/duree/init-session-duration:
 *   post:
 *     summary: Initialiser une durée de session
 *     tags: [SessionDuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duree:
 *                 type: string
 *                 format: time
 *                 description: Durée de la session au format HH:MM:SS
 *             example:
 *               duree: "01:30:00"
 *     responses:
 *       201:
 *         description: Durée de session initialisée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Durée de session initialisée avec succès."
 *                 duree:
 *                   type: string
 *                   example: "01:30:00"
 *       400:
 *         description: Erreur de validation ou format incorrect
 *       500:
 *         description: Erreur serveur
 */
router.post('/init-session-duration', initSessionDuration);

module.exports = router;
