const DureeSessionModel = require('../models/DureeSessionModel');

// Initialiser ou mettre à jour la durée de session
exports.initSessionDuration = async (req, res) => {
  try {
    const { duration } = req.body; // Récupérer la nouvelle durée de session depuis la requête

    // Vérifier que la durée est fournie
    if (!duration) {
      return res.status(400).json({ message: 'La durée de session est requise.' });
    }

    // Valider le format de la durée (par exemple, "HH:mm:ss")
    const durationRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!durationRegex.test(duration)) {
    return res.status(400).json({ message: 'Le format de la durée est invalide. Utilisez HH:mm:ss.' });
    }

    // Mettre à jour la durée de session dans la base
    const updatedSession = await DureeSessionModel.initSessionDuration(duration);

    // Réponse succès
    res.status(200).json({
    message: 'Durée de session initialisée/mise à jour avec succès.',
    sessionDuration: updatedSession,
    });
    } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
};
