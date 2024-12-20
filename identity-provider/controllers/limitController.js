const Limit = require('../models/Limit');

// Initialiser ou mettre à jour la limite de connexions
exports.initLimit = async (req, res) => {
  try {
    const { limit } = req.body; // Récupérer la nouvelle limite depuis la requête

    // Vérifier que la limite est fournie
    if (limit === undefined) {
      return res.status(400).json({ message: 'La limite de connexions est requise.' });
    }

    // Vérifier que la limite est un nombre positif
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ message: 'La limite de connexions doit être un nombre positif.' });
    }

    // Mettre à jour la limite dans la base
    const updatedLimit = await Limit.initUpdateLimit(limit);

    // Réponse succès
    res.status(200).json({
      message: 'Limite de connexions initialisée/mise à jour avec succès.',
      limit: updatedLimit,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
};

