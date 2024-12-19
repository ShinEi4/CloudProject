const CodePinModel = require('../models/CodePinModel');
const UserModel = require('../models/UserModel');

exports.verifyPin = async (req, res) => {
  try {
    const { email, codePin } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!email || !codePin) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Vérifier si le code PIN est valide (90 secondes)
    const validCodePin = await CodePinModel.findValidCodePinByUser(email, codePin);
    if (!validCodePin) {
      return res.status(400).json({
        message: 'Code PIN invalide ou expiré. Veuillez en demander un nouveau.',
      });
    }

    // Valider l'utilisateur
    await UserModel.verifyUser(email);

    // Invalider le code PIN après utilisation
    await CodePinModel.invalidateCodePin(codePin);

    res.status(200).json({ message: 'Connexion réussie. Votre inscription est validée.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur. Veuillez réessayer plus tard.' });
  }
};
