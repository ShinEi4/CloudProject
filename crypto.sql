CREATE TABLE Utilisateur(
   id_utilisateur SERIAL,
   username VARCHAR(50) ,
   email VARCHAR(70) ,
   mdp VARCHAR(255) ,
   is_valid BOOLEAN,
   PRIMARY KEY(id_utilisateur)
);

CREATE TABLE CodePin(
   id_codepin SERIAL,
   codepin VARCHAR(4) ,
   dateCreation TIMESTAMP,
   is_valid BOOLEAN,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_codepin),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE Connexion(
   id_connexion SERIAL,
   dateConnexion TIMESTAMP,
   is_valid BOOLEAN,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_connexion),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE Token(
   id_token SERIAL,
   token VARCHAR(50) ,
   date_creation TIMESTAMP,
   date_expiration TIMESTAMP,
   is_valid BOOLEAN,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_token),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE DureeSession(
   id_dureesession SERIAL,
   duree TIME,
   PRIMARY KEY(id_dureesession)
);

CREATE TABLE LimiteConnexion(
   id_limite SERIAL,
   limite INTEGER NOT NULL,
   PRIMARY KEY(id_limite)
);

CREATE TABLE Reset_token(
   id SERIAL,
   is_valid BOOLEAN,
   reset_token VARCHAR(50) ,
   created_at TIMESTAMP,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE Crypto(
   id_crypto SERIAL,
   nom_crypto VARCHAR(50)  NOT NULL,
   PRIMARY KEY(id_crypto)
);

CREATE TABLE portefeuille(
   id_portefeuille SERIAL,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_portefeuille),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE Transaction(
   id_transaction SERIAL,
   type VARCHAR(50) ,
   quantite NUMERIC(15,2)  ,
   prix_unitaire NUMERIC(15,2)  ,
   date_transaction TIMESTAMP,
   is_validate BOOLEAN,
   id_portefeuille INTEGER NOT NULL,
   id_crypto INTEGER NOT NULL,
   PRIMARY KEY(id_transaction),
   FOREIGN KEY(id_portefeuille) REFERENCES portefeuille(id_portefeuille),
   FOREIGN KEY(id_crypto) REFERENCES Crypto(id_crypto)
);

CREATE TABLE prix_crypto(
   id_prix SERIAL,
   prix NUMERIC(15,2)  ,
   date_prix TIMESTAMP,
   id_crypto INTEGER NOT NULL,
   PRIMARY KEY(id_prix),
   FOREIGN KEY(id_crypto) REFERENCES Crypto(id_crypto)
);

CREATE TABLE fond_transaction(
   id_fond SERIAL,
   type VARCHAR(50) ,
   montant NUMERIC(15,2)  ,
   date_transaction TIMESTAMP,
   is_validate SERIAL,
   id_portefeuille INTEGER NOT NULL,
   PRIMARY KEY(id_fond),
   FOREIGN KEY(id_portefeuille) REFERENCES portefeuille(id_portefeuille)
);
