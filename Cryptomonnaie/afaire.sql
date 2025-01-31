-- First, modify the foreign key to include CASCADE
ALTER TABLE prix_crypto 
DROP CONSTRAINT prix_crypto_id_crypto_fkey,
ADD CONSTRAINT prix_crypto_id_crypto_fkey 
FOREIGN KEY (id_crypto) REFERENCES Crypto(id_crypto) 
ON DELETE CASCADE;

-- Then you can safely delete from Crypto
DELETE FROM Crypto;

-- Reset the sequence for id_crypto
ALTER SEQUENCE crypto_id_crypto_seq RESTART WITH 1;

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