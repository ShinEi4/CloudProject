const express = require('express');
const { getHome } = require('../controllers/homeController');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Retourne un message de test
 *     description: Endpoint pour tester si l'API fonctionne.
 *     responses:
 *       200:
 *         description: Succès de la requête.
 *         content:
 *           application/json:
 *             example:
 *               message: "✅ API REST est en ligne avec PostgreSQL !"
 */
router.get('/', getHome);

module.exports = router;
