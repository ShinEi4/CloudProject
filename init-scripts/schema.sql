CREATE TABLE Utilisateur(
   id_utilisateur SERIAL,
   username VARCHAR(50) ,
   email VARCHAR(70) ,
   mdp VARCHAR(255) ,
   is_valid BOOLEAN,
   is_admin BOOLEAN DEFAULT FALSE,
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

CREATE TABLE portefeuille_crypto (
   id_portefeuille_crypto SERIAL,
   id_portefeuille INTEGER NOT NULL,
   id_crypto INTEGER NOT NULL,
   montant NUMERIC(15,2) DEFAULT 0,
   PRIMARY KEY(id_portefeuille_crypto),
   FOREIGN KEY(id_portefeuille) REFERENCES portefeuille(id_portefeuille),
   FOREIGN KEY(id_crypto) REFERENCES Crypto(id_crypto),
   UNIQUE(id_portefeuille, id_crypto)
);

CREATE TABLE Transaction(
   id_transaction SERIAL,
   type VARCHAR(50) ,
   quantiteEntree NUMERIC(15,2)  ,
   quantiteSortie NUMERIC(15,2) ,
   prix_unitaire NUMERIC(15,2)  ,
   date_transaction TIMESTAMP,
   is_validate BOOLEAN,
   id_portefeuille_crypto INTEGER NOT NULL,
   PRIMARY KEY(id_transaction),
   FOREIGN KEY(id_portefeuille_crypto) REFERENCES portefeuille_crypto(id_portefeuille_crypto)
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

CREATE TABLE Commission (
    id_commission SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('ACHAT', 'VENTE')),
    pourcentage DECIMAL(5,2) NOT NULL CHECK (pourcentage >= 0 AND pourcentage <= 100),
    date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO LimiteConnexion (limite) VALUES (3);
INSERT INTO DureeSession (duree) VALUES ('01:00:00');



-- Insertion d'un utilisateur initial
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('admin', 'admin@example.com', '9bb2e1c2f40c5ca2d6903a7729de79b078adfb770a4b601b05152d3246d29e6c', true, true);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user1', 'user1@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user2', 'user2@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user3', 'user3@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user4', 'user4@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user5', 'user5@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user6', 'user6@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user7', 'user7@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user8', 'user8@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);
INSERT INTO Utilisateur (username, email, mdp, is_valid, is_admin) 
VALUES ('user9', 'user9@example.com', '69ca33a2ff230f79150f8519c022d5072cd82177b0b8b4ad01c976f7996f9ab2', true, false);

-- Création d'un portefeuille pour l'utilisateur
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (1, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (2, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (3, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (4, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (5, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (6, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (7, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (8, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (9, 1000.00);
INSERT INTO portefeuille (id_utilisateur, solde)
VALUES (10, 1000.00);

-- Insertion des cryptomonnaies initiales
INSERT INTO Crypto (nom_crypto) VALUES 
('SOLANA'),      -- ~100€
('POLKADOT'),    -- ~7€
('CARDANO'),     -- ~0.50€
('AVALANCHE'),   -- ~35€
('CHAINLINK'),   -- ~15€
('COSMOS'),      -- ~9€
('ALGORAND'),    -- ~0.20€
('TEZOS'),       -- ~1€
('STELLAR'),     -- ~0.11€
('VECHAIN');     -- ~0.03€

-- Insertion des prix actuels (valeurs réelles)
INSERT INTO prix_crypto (prix, date_prix, id_crypto)
VALUES
    (100.15, NOW(), 1),  -- SOLANA
    (7.25, NOW(), 2),    -- POLKADOT
    (0.50, NOW(), 3),    -- CARDANO
    (35.40, NOW(), 4),   -- AVALANCHE
    (15.30, NOW(), 5),   -- CHAINLINK
    (9.15, NOW(), 6),    -- COSMOS
    (0.20, NOW(), 7),    -- ALGORAND
    (1.05, NOW(), 8),    -- TEZOS
    (0.11, NOW(), 9),    -- STELLAR
    (0.03, NOW(), 10);   -- VECHAIN

