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

INSERT INTO LimiteConnexion (limite) VALUES (3);
INSERT INTO DureeSession (duree) VALUES ('01:00:00');