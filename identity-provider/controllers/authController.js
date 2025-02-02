const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const CodePinModel = require('../models/CodePinModel');
const DureeSessionModel = require('../models/DureeSessionModel');
const TokenModel = require('../models/TokenModel');
const Connection = require('../models/Connection');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const moment = require('moment');

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
      // Envoyer un lien de réinitialisation par email si trop de tentatives échouées
      const resetToken = crypto.randomBytes(32).toString('hex'); // Générer un token pour la réinitialisation
      const resetLink = `${process.env.FRONTEND_URL}/api/users/reset-attempts?token=${resetToken}`;

      // Enregistrer ce token dans la base de données pour permettre la réinitialisation
      await UserModel.saveResetToken(user.id_utilisateur, resetToken);

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
        subject: 'Réinitialisation de votre mot de passe',
        html: `<p>Bonjour ${user.username},</p>
               <p>Vous avez atteint le nombre maximum de tentatives de connexion échouées.</p>
               <p>Veuillez suivre ce lien pour réinitialiser votre nombre de tentatives : <a href="${resetLink}">${resetLink}</a></p>`,
      };

      await transporter.sendMail(mailOptions);


      return res.status(429).json({ message: 'Trop de tentatives échouées. Votre compte est temporairement verrouillé en raison de plusieurs tentatives de connexion échouées. Pour des raisons de sécurité, veuillez vérifier votre boîte e-mail. Nous vous avons envoyé un lien pour réinitialiser vos tentatives de connexion.'});
    }

    var sansErreur = false;

    try {  
      // Vérifier le mot de passe
      const isPasswordValid = await UserModel.verifyMotDePasse(email, password);         
      await Connection.record(user.id_utilisateur, false);
      sansErreur = true;
    } catch (error) {
      console.error(error.message);
      if (!sansErreur) {
        await Connection.record(user.id_utilisateur, false);  
      }      
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

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
      pin: codePin
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Valider le code PIN pour finaliser la connexion
exports.verifyPin = async (req, res) => {
  try {
    const { email, codePin } = req.body;

    // Vérifier que tous les champs sont remplis
    if (!email || !codePin) {
      return res.status(400).json({ message: 'Tous les champs sont requis.'});
    }

    // Vérifier si le code PIN est valide
    const validCodePin = await CodePinModel.findValidCodePinByUser(email, codePin);
    if (!validCodePin) {
      return res.status(400).json({ message: 'Code PIN invalide ou expiré.'});
    }

    // Trouver l'utilisateur
    const user = await UserModel.getByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.'});
    }

    // Mettre à jour la dernière connexion pour la marquer comme valide
    const updatedRows = await Connection.markLastConnectionValid(user.id_utilisateur);
    if (updatedRows === 0) {
      return res.status(400).json({ message: 'Aucune tentative de connexion récente à valider.' });
    }
    console.log(updatedRows);

    // Invalider le code PIN
    await CodePinModel.invalidateCodePin(codePin);

    // Récupérer la durée de session à partir de la table DureeSession
    const dureeSession = await DureeSessionModel.getSessionDuration();
    if (!dureeSession) {
      return res.status(500).json({ message: 'Durée de session non définie dans la base de données.' });
    }

    // Générer un token JWT
    const payload = {
      id: user.id_utilisateur,
      email: user.email,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    // Calculer la date d'expiration du token
    const expirationDate = moment().add(dureeSession.duree, 'seconds').toDate();

    // Insérer le token dans la base de données
    await TokenModel.insertToken(user.id_utilisateur, token, expirationDate);

    // Répondre avec le token
    res.status(200).json({
      message: 'Connexion validée avec succès.',
      userId: user.id_utilisateur,
      token,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.body.token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify the token and get user info
        const userId = await TokenModel.verifyToken(token);
        if (!userId) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Get user info
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user info (excluding sensitive data)
        res.json({
            id: user.id_utilisateur,
            email: user.email,
            username: user.username
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
