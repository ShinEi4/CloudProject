const dotenv = require('dotenv');
const { Pool } = require('pg'); // Importer la bibliothèque pg
const app = require('./app'); // Application Express configurée

// Charger les variables d'environnement
dotenv.config();

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Test de connexion à la base de données PostgreSQL
async function startServer() {
  try {
    // Vérifier la connexion avec PostgreSQL
    await pool.connect();
    console.log('Connexion à PostgreSQL réussie !');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
  } catch (error) {
    console.error('Impossible de se connecter à PostgreSQL :', error.message);
    process.exit(1); // Arrêter en cas d'échec
  }
}

startServer();

module.exports = pool; // Exporter le pool pour l'utiliser dans d'autres modules
