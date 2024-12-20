const pool = require('../config/db');

class DureeSessionModel {
  static async getSessionDuration() {
    const result = await pool.query('SELECT duree FROM DureeSession LIMIT 1');
    return result.rows[0];
  }
  static async initUpdateSessionDuration(newSession){
    await pool.query('delete from dureesession');
    const result = await pool.query(
        'insert into dureesession (duree) values ($1)',newSession
    );
    if (result.rowCount === 0) {
        throw new Error ('erreur dans l initiation de la duree de session');
    }
    return result.rows[0];
}
}

module.exports = DureeSessionModel;