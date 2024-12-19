const pool = require('../config/db');

class UserModel {
  static async createUser(username, email, hashedPassword) {
    const query = `
      INSERT INTO Utilisateur (username, email, mdp)
      VALUES ($1, $2, $3)
      RETURNING id_utilisateur
    `;
    const result = await pool.query(query, [username, email, hashedPassword]);
    return result.rows[0];
  }

  static async findUserByEmail(email) {
    const query = `SELECT * FROM Utilisateur WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async verifyUser(email) {
    const query = `
      UPDATE Utilisateur
      SET is_valid = true
      WHERE email = $1
    `;
    await pool.query(query, [email]);
  }
}

module.exports = UserModel;
