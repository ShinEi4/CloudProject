-- Désactiver les contraintes de clé étrangère temporairement
ALTER TABLE CodePin DROP CONSTRAINT CodePin_id_utilisateur_fkey;
ALTER TABLE ModifUtilisateur DROP CONSTRAINT ModifUtilisateur_id_utilisateur_fkey;
ALTER TABLE ModifUtilisateur DROP CONSTRAINT ModifUtilisateur_id_role_fkey;
ALTER TABLE Connexion DROP CONSTRAINT Connexion_id_utilisateur_fkey;
ALTER TABLE Session DROP CONSTRAINT Session_id_utilisateur_fkey;
ALTER TABLE Session DROP CONSTRAINT Session_id_dureesession_fkey;
ALTER TABLE Utilisateur DROP CONSTRAINT Utilisateur_id_role_fkey;

-- Supprimer les données dans l'ordre des dépendances
TRUNCATE TABLE CodePin RESTART IDENTITY CASCADE;
TRUNCATE TABLE ModifUtilisateur RESTART IDENTITY CASCADE;
TRUNCATE TABLE Connexion RESTART IDENTITY CASCADE;
TRUNCATE TABLE Session RESTART IDENTITY CASCADE;
TRUNCATE TABLE Utilisateur RESTART IDENTITY CASCADE;
TRUNCATE TABLE Role RESTART IDENTITY CASCADE;
TRUNCATE TABLE DureeSession RESTART IDENTITY CASCADE;

-- Réactiver les contraintes de clé étrangère
ALTER TABLE CodePin ADD CONSTRAINT CodePin_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur (id_utilisateur);
ALTER TABLE ModifUtilisateur ADD CONSTRAINT ModifUtilisateur_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur (id_utilisateur);
ALTER TABLE ModifUtilisateur ADD CONSTRAINT ModifUtilisateur_id_role_fkey FOREIGN KEY (id_role) REFERENCES Role (id_role);
ALTER TABLE Connexion ADD CONSTRAINT Connexion_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur (id_utilisateur);
ALTER TABLE Session ADD CONSTRAINT Session_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur (id_utilisateur);
ALTER TABLE Session ADD CONSTRAINT Session_id_dureesession_fkey FOREIGN KEY (id_dureesession) REFERENCES DureeSession (id_dureesession);
ALTER TABLE Utilisateur ADD CONSTRAINT Utilisateur_id_role_fkey FOREIGN KEY (id_role) REFERENCES Role (id_role);
