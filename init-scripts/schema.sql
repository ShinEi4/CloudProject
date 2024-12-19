CREATE TABLE Utilisateur(
   id_utilisateur SERIAL,
   username VARCHAR(50) ,
   email VARCHAR(70) ,
   mdp VARCHAR(255) ,
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
   is_valid BOOLEAN,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_connexion),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);

CREATE TABLE DureeSession(
   id_dureesession SERIAL,
   duree TIME,
   PRIMARY KEY(id_dureesession)
);

CREATE TABLE Session(
   id_session SERIAL,
   adresse_ip VARCHAR(50) ,
   dateDebut TIMESTAMP,
   dateFin TIMESTAMP,
   id_dureesession INTEGER NOT NULL,
   id_utilisateur INTEGER NOT NULL,
   PRIMARY KEY(id_session),
   FOREIGN KEY(id_dureesession) REFERENCES DureeSession(id_dureesession),
   FOREIGN KEY(id_utilisateur) REFERENCES Utilisateur(id_utilisateur)
);
