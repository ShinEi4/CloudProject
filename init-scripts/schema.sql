CREATE TABLE Utilisateur(
   id_utilisateur SERIAL,
   username VARCHAR(50) ,
   email VARCHAR(70) ,
   mdp VARCHAR(255) ,
   is_valid BOOLEAN,
   PRIMARY KEY(id_utilisateur)
);

CREATE TABLE ModifUtilisateur(
   id_modif SERIAL,
   username VARCHAR(70) ,
   dateModif TIMESTAMP,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_modif),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
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
   is_valid BOOLEAN DEFAULT FALSE,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_connexion),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE DureeSession(
   id_dureesession SERIAL,
   duree TIME,
   PRIMARY KEY(id_dureesession)
);

CREATE TABLE LimiteConnexion( 
   id_limite SERIAL,
   limite INTEGER NOT NULL default 3,
   PRIMARY KEY(id_limite)
);

CREATE TABLE Token (
  id_token SERIAL PRIMARY KEY,
  token VARCHAR(512) NOT NULL,
  id_utilisateur INTEGER NOT NULL,
  date_creation TIMESTAMP,
  date_expiration TIMESTAMP,
  is_valid BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE reset_token (
  id SERIAL PRIMARY KEY,
  id_utilisateur INTEGER NOT NULL UNIQUE,
  reset_token VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_valid BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);

CREATE TABLE Crypto(
   id_crypto SERIAL,
   nom_crypto VARCHAR(50)  NOT NULL,
   PRIMARY KEY(id_crypto)
);

CREATE TABLE portefeuille(
   id_portefeuille SERIAL,
   id_utilisateur INTEGER NOT NULL,
   solde NUMERIC(15,2) NOT NULL,
   PRIMARY KEY(id_portefeuille),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE Transaction(
   id_transaction SERIAL,
   type VARCHAR(50) ,
   quantiteEntree NUMERIC(15,2)  ,
   quantiteSortie NUMERIC(15,2) ,
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
   is_validate BOOLEAN,
   id_portefeuille INTEGER NOT NULL,
   PRIMARY KEY(id_fond),
   FOREIGN KEY(id_portefeuille) REFERENCES portefeuille(id_portefeuille)
);

INSERT INTO LimiteConnexion (limite) VALUES (3);
INSERT INTO DureeSession (duree) VALUES ('01:00:00');

CREATE VIEW portefeuille_crypto_utilisateur AS
SELECT 
   c.nom_crypto,
   p.id_utilisateur,
   COALESCE(SUM(t.quantiteEntree - t.quantiteSortie), 0) AS solde
FROM 
   portefeuille p
JOIN 
   Transaction t ON p.id_portefeuille = t.id_portefeuille
JOIN 
   Crypto c ON t.id_crypto = c.id_crypto
GROUP BY 
   c.nom_crypto, p.id_utilisateur;

-- Insertion d'un utilisateur initial
INSERT INTO Utilisateur (username, email, mdp, is_valid) 
VALUES ('admin', 'admin@example.com', 'admin123', true);

-- Création d'un portefeuille pour l'utilisateur
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (1, 1000.00);

-- Insertion des cryptomonnaies initiales
INSERT INTO Crypto (nom_crypto) VALUES 
('BTC'),
('POLKADOT'),
('DOJACOIN'),
('DAMSCOIN'),
('LOMEPCOIN'),
('ETHEREUM'),
('SOLANA'),
('CRONOS'),
('DODGECOIN');

-- Insertion des prix initiaux
INSERT INTO prix_crypto (prix, date_prix, id_crypto)
SELECT 
    100.00 as prix,
    CURRENT_TIMESTAMP as date_prix,
    id_crypto
FROM Crypto;

