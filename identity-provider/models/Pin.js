const pool = require('../config/db');

class Pin {
  static async create(codePin, userId) {
    await pool.query(
      `INSERT INTO CodePin (codepin, dateCreation, is_valid, id_utilisateur) VALUES ($1, CURRENT_TIMESTAMP, TRUE, $2)`,
      [codePin, userId]
    );
  }

  static async validate(codePin, userId) {
    const result = await pool.query(
      `SELECT * FROM CodePin WHERE codepin = $1 AND id_utilisateur = $2 AND is_valid = TRUE AND dateCreation > NOW() - INTERVAL '10 minutes'`,
      [codePin, userId]
    );
    return result.rows[0];
  }
}

module.exports = Pin;
