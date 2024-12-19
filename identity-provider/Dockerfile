# Étape 1 : Utiliser l'image Node.js officielle
FROM node:20

# Étape 2 : Définir le répertoire de travail
WORKDIR /usr/src/app

# Étape 3 : Copier uniquement package.json et package-lock.json pour optimiser le cache
COPY package*.json ./

# Étape 4 : Installer les dépendances
RUN npm install --only=production

# Étape 5 : Copier les fichiers de l'application
COPY . .

# Étape 6 : Exposer le port 3000
EXPOSE 3000

# Étape 7 : Démarrer l'application
CMD ["node", "server.js"]
