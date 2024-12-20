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
       WHERE id_utilisateur = $1 
         AND is_valid = FALSE 
         AND dateConnexion > (
             SELECT COALESCE(MAX(dateConnexion), '1970-01-01 00:00:00') 
             FROM Connexion 
             WHERE id_utilisateur = $1 
               AND is_valid = TRUE
         )`,
      [userId]
    );
    return result.rows[0].failed_attempts;
  }

  static async getMaxFailedAttempts() {
    const result = await pool.query(
      `select limite from limiteConnexion limit 1`
    );
    return parseInt(result.rows[0].limite,10);
  }

  // Connection.js
  static async markLastConnectionValid(userId) {
    const result = await pool.query(
      `UPDATE Connexion
      SET is_valid = TRUE
      WHERE id_utilisateur = $1 
        AND is_valid = FALSE 
        AND dateConnexion = (
          SELECT MAX(dateConnexion) 
          FROM Connexion 
          WHERE id_utilisateur = $1 AND is_valid = FALSE
        )`,
      [userId]
    );
    return result.rowCount; // Nombre de lignes mises à jour
  }
}

module.exports = Connection;
