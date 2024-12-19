const pool = require('../config/db');

class Limit {
    static async init() {
        const existing = await pool.query('SELECT COUNT(*) AS count FROM limiteconnexion');
        if (parseInt(existing.rows[0].count, 10) === 0) {
            await pool.query('INSERT INTO limiteconnexion (limite) VALUES ($1)', [3]);
        }
    }  
    static async get() {
        const result = await pool.query('SELECT limite FROM LimiteConnexion LIMIT 1');
        return result.rows[0]?.limite;
    }
    static async updateLimit(newLimit) {
        const result = await pool.query(
          'UPDATE limiteconnexion SET limite = $1 WHERE id_limite = 1 RETURNING *',
        [newLimit]
        );
    
        if (result.rowCount === 0) {
            throw new Error('ID 1 introuvable dans la table limiteconnexion.');
        }
    
        return result.rows[0];
    }
    
}

module.exports = Limit;
