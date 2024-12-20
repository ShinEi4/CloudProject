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
}

module.exports = TokenModel;