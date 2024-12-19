const pool = require('../config/db');

class Connection {
  static async record(userId, isValid) {
    await pool.query(
      `INSERT INTO Connexion (dateConnexion, is_valid, id_utilisateur) VALUES (CURRENT_TIMESTAMP, $1, $2)`,
      [isValid, userId]
    );
  }

  static async countFailedAttempts(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS failed_attempts 
       FROM Connexion 
       WHERE id_utilisateur = $1 AND is_valid = FALSE AND dateConnexion > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    return parseInt(result.rows[0].failed_attempts, 10);
  }
  static async getMaxFailedAttempts() {
    const result = await pool.query(
      `select limite from limiteConnexion limit 1`
    );
    return parseInt(result.rows[0].limit,10);
  }
}

module.exports = Connection;
