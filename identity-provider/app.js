const express = require('express');
const homeRoutes = require('./routes/homeRoutes');
const userRoutes = require('./routes/userRoutes');
const limitRoutes = require('./routes/limitRoutes');
const dureeSessionRoutes = require('./routes/dureesessionRoutes');

const authRoutes = require('./routes/authroutes');
const pinRoutes = require('./routes/pinRoutes');
const { swaggerUi, swaggerSpec } = require('./swagger');


const app = express();
app.use(express.json()); // Middleware pour les requêtes JSON

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Importer les routes
app.use('/', homeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/limit',limitRoutes);
app.use('/api/duree',dureeSessionRoutes);

module.exports = app;
