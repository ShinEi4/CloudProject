const crypto = require('crypto'); // Importer la bibliothèque crypto
const pool = require('../config/db');

class UserModel {
  // Méthode pour hacher un mot de passe avec crypto
  static hashPassword(password) {
    const salt = process.env.SALT || 'default_salt'; // Utiliser un salt fixe ou configurable
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  // Créer un utilisateur
  static async createUser(username, email, password) {
    const query = `
      INSERT INTO Utilisateur (username, email, mdp)
      VALUES ($1, $2, $3)
      RETURNING id_utilisateur
    `;
    const result = await pool.query(query, [username, email, password]);
    return result.rows[0];
  }

  // Trouver un utilisateur par email
  static async findUserByEmail(email) {
    const query = `SELECT * FROM Utilisateur WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  // Valider un utilisateur (par exemple, après vérification d'un email ou d'un code PIN)
  static async verifyUser(email) {
    const query = `
      UPDATE Utilisateur
      SET is_valid = true
      WHERE email = $1
    `;
    await pool.query(query, [email]);
  }

  // Vérifier le mot de passe d'un utilisateur
  static async verifyMotDePasse(email, mdp) {
    const query = `
      SELECT email, mdp FROM Utilisateur WHERE email = $1
    `;
    const rs = await pool.query(query, [email]);

    if (rs.rows.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }

    const hashedPassword = this.hashPassword(mdp); // Hacher le mot de passe fourni
    const storedPassword = rs.rows[0].mdp; // Mot de passe haché stocké dans la base de données

    if (hashedPassword != storedPassword) {
      console.log(hashedPassword);
      console.log(storedPassword);
      throw new Error('Mot de passe incorrect');
    }

    // Retourner l'utilisateur si le mot de passe est valide
    return await this.getByEmail(email);
  }

  // Récupérer un utilisateur par email
  static async getByEmail(email) {
    const result = await pool.query('SELECT * FROM Utilisateur WHERE email = $1', [email]);
    return result.rows[0];
  }

  // Réinitialiser les tentatives de connexion pour un utilisateur
  static async resetAttempts(userId) {
    await pool.query(`DELETE FROM Connexion WHERE id_utilisateur = $1 AND is_valid = FALSE`, [userId]);
  }
}

module.exports = UserModel;
