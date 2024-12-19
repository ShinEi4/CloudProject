const bcrypt = require('bcryptjs'); // Pour hacher les mots de passe
const { Pool } = require('pg'); // Importer la bibliothèque pg

// Configuration de la connexion à PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Créer un utilisateur
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Vérifier si l'email existe déjà
    const emailCheckQuery = 'SELECT * FROM Utilisateur WHERE email = $1';
    const emailCheckResult = await pool.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur dans la base de données
    const insertUserQuery = `
      INSERT INTO Utilisateur (username, email, mdp)
      VALUES ($1, $2, $3)
      RETURNING id_utilisateur, username, email
    `;
    const result = await pool.query(insertUserQuery, [username, email, hashedPassword]);

    // Retourner la réponse avec les données utilisateur
    const newUser = result.rows[0];
    res.status(201).json({
      message: 'Utilisateur créé avec succès.',
      user: newUser,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
