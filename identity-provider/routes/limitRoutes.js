const express = require('express');
const { initLimit, getLimit } = require('../controllers/limitController');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Limit
 *   description: Gestion des limites de connexion
 */

/**
 * @swagger
 * /api/limit/init-limit:
 *   post:
 *     summary: Initialiser ou mettre à jour la limite de connexion
 *     tags: [Limit]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limite:
 *                 type: integer
 *                 description: Nombre maximum de connexions autorisées
 *             example:
 *               limite: 5
 *     responses:
 *       201:
 *         description: Limite initialisée ou mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Limite initialisée avec succès."
 *                 limite:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post('/init-limit', initLimit);

/**
 * @swagger
 * /api/limit/get-limit:
 *   get:
 *     summary: Récupérer la limite de connexion actuelle
 *     tags: [Limit]
 *     responses:
 *       200:
 *         description: Limite récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 limite:
 *                   type: integer
 *                   example: 5
 *       404:
 *         description: Limite non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get('/get-limit', getLimit);

module.exports = router;
