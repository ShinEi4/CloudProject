const nodemailer = require('nodemailer');
require('dotenv').config();

exports.sendEmail = async (req, res) => {
  try {
    // Récupérer les données nécessaires depuis req.body
    const { to, subject, htmlContent } = req.body;

    // Validation des champs
    if (!to || !subject || !htmlContent) {
      return res.status(400).json({
        status: 'error',
        message: 'Les champs "to", "subject", et "htmlContent" sont requis.',
      });
    }

    // Configurer le transporteur
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Service d'email
      auth: {
        user: process.env.EMAIL_USER, // Email de l'expéditeur
        pass: process.env.EMAIL_PASS, // Mot de passe ou token de l'expéditeur
      },
    });

    // Options de l'email
    const mailOptions = {
      from: process.env.EMAIL_USER, // Expéditeur
      to,                          // Destinataire
      subject,                     // Sujet
      html: htmlContent,           // Contenu en HTML
    };

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email envoyé avec succès : ${info.response}`);

    // Retourner une réponse HTTP de succès
    return res.status(200).json({
      status: 'success',
      message: 'Email envoyé avec succès.',
      details: info.response,
    });
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email : ${error.message}`);

    // Retourner une réponse HTTP d'erreur
    return res.status(500).json({
      status: 'error',
      message: 'Erreur lors de l\'envoi de l\'email.',
      error: error.message,
    });
  }
};
