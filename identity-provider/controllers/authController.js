const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const CodePinModel = require('../models/CodePinModel');
const Connection = require('../models/Connection');
const nodemailer = require('nodemailer');
require('dotenv').config();

function hashPassword(password) {
  const salt = process.env.SALT || 'default_salt'; // Salt fixe ou configurable
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Trouver l'utilisateur
    const user = await UserModel.getByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Compter les tentatives échouées
    const maxFailedAttempts = await Connection.getMaxFailedAttempts();
    const failedAttempts = await Connection.countFailedAttempts(user.id_utilisateur);
    if (failedAttempts >= maxFailedAttempts) {
      return res.status(429).json({ message: 'Trop de tentatives échouées. Veuillez réessayer plus tard.' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await UserModel.verifyMotDePasse(email, password);
    if (!isPasswordValid) {
      // Enregistrer une tentative échouée
      await Connection.record(user.id_utilisateur, false);
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Enregistrer une connexion réussie
    await Connection.record(user.id_utilisateur, true);

    // Générer un code PIN à 4 chiffres
    const codePin = Math.floor(1000 + Math.random() * 9000).toString();

    // Stocker le code PIN
    await CodePinModel.createCodePin(codePin, user.id_utilisateur);

    // Configurer le transporteur pour envoyer l'email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Code de validation de votre connexion',
      html: `<p>Bonjour ${user.username},</p>
             <p>Voici votre code de validation pour finaliser votre connexion : <b>${codePin}</b></p>
             <p>Merci de l'utiliser dans les prochaines minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Utilisateur connecté avec succès. Veuillez vérifier votre email pour valider votre connexion.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Valid
// er le code PIN pour finaliser la connexion
exports.verifyPin = async (req, res) => {
  try {
    const { email, codePin } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!email || !codePin) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Vérifier si le code PIN est valide
    const validCodePin = await CodePinModel.findValidCodePinByUser(email, codePin);
    if (!validCodePin) {
      return res.status(400).json({ message: 'Code PIN invalide ou expiré.' });
    }

    // Valider l'utilisateur
    await UserModel.verifyUser(email);

    // Invalider le code PIN
    await CodePinModel.invalidateCodePin(codePin);

    res.status(200).json({ message: 'Connexion validée avec succès.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
