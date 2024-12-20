const pool = require('../config/db');

class Limit {
    static async initUpdateLimit(newLimit){
        await pool.query('delete from limiteconnexion');
        const result = await pool.query(
            'insert into limiteconnexion (limite) values ($1)',newLimit
        );
        if (result.rowCount === 0) {
            throw new Error ('erreur dans l initiation de la limite de connexion');
        }
        return result.rows[0];
    }
    static async get() {
        const result = await pool.query('SELECT limite FROM LimiteConnexion LIMIT 1');
        return result.rows[0]?.limite;
    }
    
    
}

module.exports = Limit;
