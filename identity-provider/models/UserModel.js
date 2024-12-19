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

  static async getByEmail(email) {
    const result = await pool.query('SELECT * FROM Utilisateur WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async resetAttempts(userId) {
    await pool.query(`DELETE FROM Connexion WHERE id_utilisateur = $1 AND is_valid = FALSE`, [userId]);
  }

  static async updateUser(userId, updates) {
    const fields = [];
    const values = [];
    let index = 1;
  
    // Préparer les champs à mettre à jour dynamiquement
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  
    if (fields.length === 0) {
      throw new Error('Aucune donnée à mettre à jour.');
    }
  
    // Ajouter l'identifiant de l'utilisateur
    values.push(userId);
  
    const query = `
      UPDATE Utilisateur
      SET ${fields.join(', ')}
      WHERE id_utilisateur = $${index}
      RETURNING *
    `;
  
    const result = await pool.query(query, values);
    return result.rows[0];
  }  
}

module.exports = UserModel;
