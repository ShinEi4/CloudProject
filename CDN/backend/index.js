require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const streamifier = require('streamifier');

const app = express();
app.use(express.json());
app.use(cors());

// 🔍 Vérification de la configuration Cloudinary
console.log("Configuration Cloudinary :", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "Manquant"
});

// Configuration de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurer Multer pour gérer les fichiers
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route pour uploader une image
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log("❌ Aucun fichier reçu !");
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    console.log("📂 Fichier reçu :", req.file.originalname);

    let stream = cloudinary.uploader.upload_stream(
      { folder: "test_cdn", use_filename: true, unique_filename: false },
      (error, result) => {
        if (error) {
          console.error("❌ Erreur Cloudinary :", error);
          return res.status(500).json({ error });
        }
        console.log("✅ Image uploadée :", result.secure_url);
        res.json({ imageUrl: result.secure_url });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);

  } catch (err) {
    console.error("❌ Erreur serveur :", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
