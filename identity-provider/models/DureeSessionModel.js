const pool = require('../config/db');

class DureeSessionModel {
  static async getSessionDuration() {
    const result = await pool.query('SELECT duree FROM DureeSession LIMIT 1');
    return result.rows[0]; // Retourne la première ligne avec la durée
  }
}

module.exports = DureeSessionModel;