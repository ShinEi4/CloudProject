-- Désactiver temporairement les contraintes de clé étrangère
ALTER TABLE ModifUtilisateur DROP CONSTRAINT modifutilisateur_id_utilisateur_fkey;
ALTER TABLE CodePin DROP CONSTRAINT codepin_id_utilisateur_fkey;
ALTER TABLE Connexion DROP CONSTRAINT connexion_id_utilisateur_fkey;
ALTER TABLE Session DROP CONSTRAINT session_id_utilisateur_fkey;
ALTER TABLE Session DROP CONSTRAINT session_id_dureesession_fkey;

-- Supprimer les données de toutes les tables
TRUNCATE TABLE 
    ModifUtilisateur,
    CodePin,
    Connexion,
    Session,
    DureeSession,
    LimiteConnexion,
    Utilisateur
RESTART IDENTITY CASCADE;

-- Réactiver les contraintes de clé étrangère
ALTER TABLE ModifUtilisateur ADD CONSTRAINT modifutilisateur_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE CodePin ADD CONSTRAINT codepin_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE Connexion ADD CONSTRAINT connexion_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE Session ADD CONSTRAINT session_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE Session ADD CONSTRAINT session_id_dureesession_fkey FOREIGN KEY (id_dureesession) REFERENCES DureeSession(id_dureesession);

-- Réinitialiser les séquences associées aux colonnes SERIAL
DO $$
BEGIN
    EXECUTE (
        SELECT string_agg(
            'ALTER SEQUENCE ' || pg_namespace.nspname || '.' || pg_class.relname || ' RESTART WITH 1;',
            ' '
        )
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_class.relkind = 'S'
    );
END $$;

-- Remettre les tables à zéro
INSERT INTO LimiteConnexion (limite) VALUES (3);
