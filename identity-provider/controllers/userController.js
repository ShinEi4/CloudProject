const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const TokenModel = require('../models/TokenModel');
const CodePinModel = require('../models/CodePinModel');
const nodemailer = require('nodemailer');
const Connection = require('../models/Connection');
require('dotenv').config();

// Fonction utilitaire pour hacher un mot de passe
function hashPassword(password) {
  const salt = process.env.SALT || 'default_salt'; // Salt fixe ou configurable
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// Fonction d'inscription d'un utilisateur
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
      if (existingUser.is_valid) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé.' }); 
      }

      // Si l'utilisateur n'est pas validé, mettre à jour ses informations
      const updates = {
        username,  // Mettre à jour le nom d'utilisateur
        mdp: hashPassword(password), // Hacher le mot de passe avant de le mettre à jour        
      };

      // Utiliser la méthode updateUser pour modifier l'utilisateur existant
      await UserModel.updateUser(existingUser.id_utilisateur, updates);

      // Si l'utilisateur n'est pas validé, régénérer un code PIN
      const codePin = Math.floor(1000 + Math.random() * 9000).toString();
      await CodePinModel.createCodePin(codePin, existingUser.id_utilisateur);

      // Envoyer un nouvel email avec le code PIN
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
        html: `<p>Bonjour ${existingUser.username},</p>
               <p>Voici votre nouveau code de validation : <b>${codePin}</b></p>
               <p>Merci de l'utiliser dans les prochaines minutes.</p>`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        message: 'Un nouveau code PIN a été envoyé à votre adresse email.',
      });
    }






    // Hacher le mot de passe
    const hashedPassword = hashPassword(password);
    console.log(hashedPassword);

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

exports.resetAttempts = async (req, res) => {
  try {
    const { token } = req.query;

    // Vérifier que tous les champs sont remplis
    if (!token) {
      return res.status(400).json({ message: 'Token manquant.' });
    }

    // Vérifier la validité du token de réinitialisation
    const iduser = await UserModel.verifyResetToken(token);
    if (!iduser) {
      return res.status(400).json({ message: 'Token de réinitialisation invalide ou expiré.' });
    }

    // Réinitialiser les tentatives de connexion
    await Connection.record(iduser, true);

    // Invalider le token de réinitialisation
    await UserModel.invalidateResetToken(iduser);

    res.status(200).json({
      message: 'Les tentatives de connexion ont été réinitialisées avec succès.',
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Fonction pour mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    // Récupérer le token depuis l'en-tête ou le corps de la requête
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;

    if (!token) {
      return res.status(401).json({ message: 'Token manquant ou invalide.' });
    }
    console.log("token");
    console.log(token);
    // Vérifier si le token est valide et récupérer l'ID utilisateur associé
    const userId = await TokenModel.verifyToken(token);
    if (!userId) {
      return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }

    const {username, email, mdp } = req.body; // On suppose que ces données viennent du corps de la requête

    // Vérifier que les données nécessaires sont présentes
    if (!username && !mdp) {
      return res.status(400).json({ message: 'Au moins un champ doit être fourni pour la mise à jour.' });
    }

    // Si un mot de passe est fourni, il doit être haché avant d'être enregistré
    let updates = {};
    if (mdp) {
      updates.mdp = hashPassword(mdp);
    }

    if (username) updates.username = username;    

    // Utiliser la méthode updateUser du modèle pour effectuer la mise à jour
    const updatedUser = await UserModel.updateUser(userId, updates);

    // Si l'utilisateur n'a pas été trouvé ou mis à jour
    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Retourner la réponse
    res.status(200).json({
      message: 'Utilisateur mis à jour avec succès.'
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};