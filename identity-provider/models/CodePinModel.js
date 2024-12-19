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
      SELECT cp.* 
      FROM CodePin cp 
      JOIN Utilisateur u ON u.id_utilisateur = cp.id_utilisateur 
      WHERE u.email = $1 
        AND cp.codepin = $2 
        AND cp.dateCreation > NOW() - INTERVAL '90 seconds'
    `;
    const result = await pool.query(query, [email, codePin]);
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
