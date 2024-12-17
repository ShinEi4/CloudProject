const dotenv = require('dotenv');
const sequelize = require('./config/db'); // Connexion DB
const app = require('./app'); // Application Express configurée

// Charger les variables d'environnement
dotenv.config();

// Test de connexion à la base de données PostgreSQL
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à PostgreSQL réussie !');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
  } catch (error) {
    console.error('Impossible de se connecter à PostgreSQL :', error.message);
    process.exit(1); // Arrêter en cas d'échec
  }
}

startServer();
