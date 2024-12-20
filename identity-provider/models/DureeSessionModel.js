const pool = require('../config/db');

class DureeSessionModel {
  static async getSessionDuration() {
    const result = await pool.query('SELECT duree FROM DureeSession LIMIT 1');
    return result.rows[0];
  }
  static async initSessionDuration(newSession) {
    // Supprimer les anciennes données
    await pool.query('DELETE FROM dureesession');

    // Insérer la nouvelle durée
    const result = await pool.query(
      'INSERT INTO dureesession (duree) VALUES ($1) RETURNING *',
      [newSession] // Corrigé : Passe la valeur sous forme de tableau
    );

    if (result.rowCount === 0) {
      throw new Error('Erreur dans l\'initialisation de la durée de session');
    }

    return result.rows[0]; // Retourne la ligne insérée
  }
}

module.exports = DureeSessionModel;