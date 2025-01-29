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

  static async updateUser(userId, updates) {
    const fields = [];
    const values = [];
    let index = 1;
  
    // Préparer les champs à mettre à jour dynamiquement
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  
    if (fields.length === 0) {
      throw new Error('Aucune donnée à mettre à jour.');
    }
  
    // Ajouter l'identifiant de l'utilisateur
    values.push(userId);
  
    const query = `
      UPDATE Utilisateur
      SET ${fields.join(', ')}
      WHERE id_utilisateur = $${index}
      RETURNING *
    `;
  
    const result = await pool.query(query, values);
    return result.rows[0];
  }  

  // Fonction pour sauvegarder le token de réinitialisation
  static async saveResetToken(userId, resetToken) {
    try {
      // Requête SQL pour insérer ou mettre à jour le token de réinitialisation
      const query = `
        INSERT INTO reset_token (id_utilisateur, reset_token, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id_utilisateur)
        DO UPDATE SET reset_token = $2, created_at = NOW();
      `;

      const values = [userId, resetToken];

      // Exécuter la requête
      await pool.query(query, values);
      console.log('Token de réinitialisation sauvegardé avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token de réinitialisation:', error.message);
      throw new Error('Erreur lors de l\'enregistrement du token.');
    }
  }

  static async verifyResetToken(token) {
    const query = `
      SELECT id_utilisateur
      FROM reset_token
      WHERE reset_token = $1 AND is_valid IS TRUE
    `;
    const values = [token];

    try {
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
        return null; // Token invalide ou expiré
      }

      return result.rows[0].id_utilisateur; // Retourne l'ID de l'utilisateur associé au token
    } catch (error) {
      console.error('Erreur lors de la vérification du token de réinitialisation:', error.message);
      throw new Error('Erreur serveur.');
    }
  }

  static async invalidateResetToken(id_utilisateur) {
    const query = `
      UPDATE reset_token
      SET is_valid = FALSE
      WHERE id_utilisateur = $1 AND is_valid = TRUE
    `;
    const values = [id_utilisateur];
  
    try {
      const result = await pool.query(query, values);
      return result.rowCount; // Nombre de tokens invalidés
    } catch (error) {
      console.error('Erreur lors de l\'invalidation des tokens de réinitialisation:', error.message);
      throw new Error('Erreur serveur.');
    }
  }  

  // Add this method to the UserModel class
  static async findById(userId) {
    const query = `SELECT * FROM Utilisateur WHERE id_utilisateur = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = UserModel;
