const pool = require('../config/db');

class CodePinModel {
  static async createCodePin(codePin, userId) {
    const query = `
      INSERT INTO CodePin (codepin, dateCreation, is_valid, id_utilisateur)
      VALUES ($1, NOW(), true, $2)
    `;
    await pool.query(query, [codePin, userId]);
  }

  static async findValidCodePinByUser(email, codePin) {
    const query = `
      SELECT * FROM CodePin
      WHERE codepin = $1 AND is_valid = true
      AND id_utilisateur = (SELECT id_utilisateur FROM Utilisateur WHERE email = $2)
    `;
    const result = await pool.query(query, [codePin, email]);
    return result.rows[0];
  }

  static async invalidateCodePin(codePin) {
    const query = `
      UPDATE CodePin
      SET is_valid = false
      WHERE codepin = $1
    `;
    await pool.query(query, [codePin]);
  }
}

module.exports = CodePinModel;
