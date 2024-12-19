const transporter = require('../config/mailer');

const sendPinEmail = async (to, pin) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Votre code PIN',
    text: `Votre code PIN est : ${pin}`,
  });
};

const sendResetLimitEmail = async (to) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Réinitialisation de limite',
    text: `Votre compte a atteint la limite de tentatives. Cliquez ici pour réinitialiser.`,
  });
};

module.exports = { sendPinEmail, sendResetLimitEmail };
