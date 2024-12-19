const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const CodePinModel = require('../models/CodePinModel');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Créer un utilisateur et envoyer un code PIN
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const newUser = await UserModel.createUser(username, email, hashedPassword);

    // Générer un code PIN à 4 chiffres
    const codePin = Math.floor(1000 + Math.random() * 9000).toString();

    // Stocker le code PIN
    await CodePinModel.createCodePin(codePin, newUser.id_utilisateur);

    // Envoyer l'email
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
      subject: 'Code de validation de votre inscription',
      html: `<p>Bonjour ${username},</p>
             <p>Voici votre code de validation pour finaliser votre inscription : <b>${codePin}</b></p>
             <p>Merci de l'utiliser dans les prochaines minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Utilisateur créé avec succès. Veuillez vérifier votre email pour valider votre inscription.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Valider le code PIN pour finaliser l'inscription
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

    res.status(200).json({ message: 'Inscription validée avec succès.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
