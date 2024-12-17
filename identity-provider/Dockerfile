# Étape 1 : Utilisation de l'image Node.js
FROM node:20

# Étape 2 : Définir le répertoire de travail
WORKDIR /usr/src/app

# Étape 3 : Copier package.json et package-lock.json pour optimiser le cache
COPY package*.json ./

# Étape 4 : Installer uniquement les dépendances nécessaires en production
RUN npm install --only=production

# Étape 5 : Copier le reste des fichiers
COPY . .

# Étape 6 : Exécuter la migration Sequelize (si applicable)
# Exemple si Sequelize est utilisé pour PostgreSQL
CMD ["npx", "sequelize-cli", "db:migrate"]

# Étape 7 : Exposer le port 3000
EXPOSE 3000

# Étape 8 : Démarrer l'application
CMD ["node", "server.js"]
