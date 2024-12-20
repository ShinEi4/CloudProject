const pool = require('../config/db');

class TokenModel {
  static async insertToken(userId, token, expirationDate) {
    const query = `
        INSERT INTO Token (token, id_utilisateur, date_creation, date_expiration, is_valid)
        VALUES ($1, $2, NOW(), $3, TRUE)
    `;
    const values = [token, userId, expirationDate];

    try {
        await pool.query(query, values);
    } catch (error) {
        throw new Error('Erreur lors de l\'insertion du token dans la base de données');
    }
  }

  static async verifyToken(token) {
    const query = `
      SELECT id_utilisateur 
      FROM Token 
      WHERE token = $1 AND is_valid = TRUE AND date_expiration > NOW()
    `;
    const values = [token];

    try {
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
        return null; // Token invalide ou expiré
      }
      return result.rows[0].id_utilisateur; // Retourne l'ID utilisateur associé
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error.message);
      throw new Error('Erreur serveur lors de la vérification du token.');
    }
  }
}

module.exports = TokenModel;