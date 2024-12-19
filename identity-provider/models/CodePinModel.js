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
      AND cp.dateCreation > NOW() - INTERVAL '90 seconds'
      ORDER BY cp.dateCreation DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [email]); // Pas besoin de passer codePin ici
    const mostRecentCodePin = result.rows[0];
    
    // Comparer si le code PIN de la base de données correspond à celui de l'argument
    if (mostRecentCodePin && mostRecentCodePin.codepin === codePin) {
        return mostRecentCodePin; // Code PIN valide
    }
    return null; // Code PIN invalide ou non trouvé
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
