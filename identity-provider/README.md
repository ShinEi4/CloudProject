# 📦 Projet API REST Node.js avec PostgreSQL

Ce projet est une **API REST** développée avec **Node.js** et **Express.js**, en utilisant **Pg** comme ORM pour gérer une base de données **PostgreSQL**. Le projet suit une structure **MVC** (Model-View-Controller) pour une meilleure organisation et lisibilité.

---

## **🚀 Fonctionnalités**

- **Connexion à PostgreSQL** via pg (pool).
- **Route de base** pour tester l'API.
- **Structure MVC** claire :
  - **Models** : Définition des tables de la base.
  - **Controllers** : Gestion de la logique métier.
  - **Routes** : Gestion des endpoints pour accéder aux fonctionnalités.
- **Conteneurisation avec Docker** et **Docker Compose**.
- **Variables d'environnement** centralisées dans `.env`.

---

## **🗂️ Structure du Projet**

Voici la structure du projet pour faciliter la navigation :

```plaintext
ProjetCloud/
└── identity-provider/           # Répertoire principal du projet Node.js
    ├── Dockerfile               # Fichier Dockerfile pour construire l'image Node.js
    ├── package.json             # Dépendances et scripts NPM
    ├── .env                     # Variables d'environnement pour PostgreSQL
    ├── server.js                # Point d'entrée principal
    ├── app.js                   # Configuration Express (middleware et routes)
    ├── config/                  # Configuration
    │   └── db.js                # Configuration de la connexion PostgreSQL
    ├── models/                  # Modèles Sequelize
    │   └── User.js              # Exemple de modèle utilisateur
    ├── controllers/             # Contrôleurs (logique métier)
    │   └── homeController.js    # Contrôleur pour la route de base
    └── routes/                  # Définition des routes
        └── homeRoutes.js        # Routes associées au contrôleur

#🔧 Prérequis
Avant d'exécuter le projet, assurez-vous d'avoir installé :

Node.js (version 16+ recommandée)
Docker et Docker Compose
Un client API (ex : Postman ou Insomnia) pour tester les routes.

⚙️ Installation et Configuration
1. Clonez le projet
    git clone <https://github.com/ShinEi4/CloudProject.git>
    cd ProjetCloud/identity-provider

2. Configurez les variables d'environnement
Créez un fichier .env dans le dossier identity-provider avec :
    PORT=3000
    DB_HOST=postgres
    DB_PORT=5432
    DB_USER=postgres
    DB_PASS=postgres_password
    DB_NAME=identity_db

=> 3. Lancez les services API avec Docker
Depuis la racine ProjetCloud, exécutez :
    docker-compose up --build

Pour faire des requetes postgres via docker :
    docker exec -it postgres_db psql -U postgres -d identity_db
-- Afficher toutes les tables
    \dt    

📡 Routes Disponibles
Ouvrez votre navigateur et accédez à l'URL suivante : http://localhost:3000/api-docs
Vous verrez l'interface Swagger UI avec la documentation de vos routes.
Ajout de Routes Supplémentaires
Pour documenter d'autres routes, ajoutez simplement des annotations Swagger dans les fichiers de routes concernés, par exemple :
    /**
    * @swagger
    * /api/users:
    *   get:
    *     summary: Récupérer tous les utilisateurs
    *     responses:
    *       200:
    *         description: Retourne la liste des utilisateurs.
    */
    router.get('/api/users', getAllUsers);

💻 Commandes Utiles
Démarrer les conteneurs et rebuild les images:
    docker-compose up --build
Arrêter les conteneurs :
    docker-compose down
Rebuild des images Docker :
    docker-compose build


❗NB: Les collections postman sont presents dans collection.json


🛠️ Technologies Utilisées
Node.js : Environnement d'exécution JavaScript.
Express.js : Framework minimaliste pour créer des API REST.
Sequelize : ORM pour gérer la base PostgreSQL.
PostgreSQL : Base de données relationnelle.
Docker & Docker Compose : Conteneurisation pour l'orchestration des services.
Dotenv : Gestion des variables d'environnement.


❗ Gestion des Erreurs
Connexion échouée à PostgreSQL :
    Vérifiez les logs et assurez-vous que les variables DB_USER, DB_PASS et DB_NAME dans .env sont correctes.
Port en conflit :
    Si le port 3000 ou 5432 est déjà utilisé, modifiez-le dans .env ou dans docker-compose.yml.