-- Désactiver temporairement les contraintes de clé étrangère
ALTER TABLE ModifUtilisateur DROP CONSTRAINT IF EXISTS modifutilisateur_id_utilisateur_fkey;
ALTER TABLE CodePin DROP CONSTRAINT IF EXISTS codepin_id_utilisateur_fkey;
ALTER TABLE Connexion DROP CONSTRAINT IF EXISTS connexion_id_utilisateur_fkey;
ALTER TABLE Token DROP CONSTRAINT IF EXISTS token_id_utilisateur_fkey;

-- Supprimer les données de toutes les tables et réinitialiser les séquences
TRUNCATE TABLE 
    ModifUtilisateur,
    CodePin,
    Connexion,
    Token,
    DureeSession,
    LimiteConnexion,
    Utilisateur
RESTART IDENTITY CASCADE;

-- Réactiver les contraintes de clé étrangère
ALTER TABLE ModifUtilisateur ADD CONSTRAINT modifutilisateur_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE CodePin ADD CONSTRAINT codepin_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE Connexion ADD CONSTRAINT connexion_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);
ALTER TABLE Token ADD CONSTRAINT token_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur);

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

-- Remettre les tables à zéro avec les valeurs par défaut
INSERT INTO LimiteConnexion (limite) VALUES (3);
INSERT INTO DureeSession (duree) VALUES ('01:00:00');
