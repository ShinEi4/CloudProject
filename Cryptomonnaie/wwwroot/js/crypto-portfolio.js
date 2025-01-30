let userId = null;
let userName = null;

// Fonction pour charger les informations de l'utilisateur
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/Home/Login';
        return;
    }

    try {
        const response = await fetch('/api/Authentication/user-info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userData = await response.json();
        userId = userData.id;
        userName = userData.username; // Supposons que l'API renvoie un champ username
        document.getElementById('userDisplayName').textContent = userName;
        loadPortfolio();
        loadCryptoList();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load user information');
        window.location.href = '/Home/Login';
    }
}

// Fonctions existantes modifiées pour utiliser le token
async function loadPortfolio() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/CryptoTransaction/portfolio/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        const tbody = document.getElementById('portfolioTableBody');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.crypto}</td>
                <td>${item.montant.toFixed(6)}</td>
                <td>${item.prix_actuel.toFixed(2)}€</td>
                <td>${item.valeur_totale.toFixed(2)}€</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="prepareTransaction('buy', '${item.crypto}')">Acheter</button>
                    <button class="btn btn-sm btn-danger" onclick="prepareTransaction('sell', '${item.crypto}')">Vendre</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadCryptoList() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/crypto/prices', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        const select = document.getElementById('cryptoSelect');
        const selectedValue = select.value; // Sauvegarder la valeur sélectionnée
        select.innerHTML = '';
        
        data.forEach(crypto => {
            const option = document.createElement('option');
            option.value = crypto.id;
            option.textContent = `${crypto.crypto} (${crypto.prix.toFixed(2)}€)`;
            option.dataset.nom = crypto.crypto;
            select.appendChild(option);
        });

        // Restaurer la sélection si elle existe toujours
        if (selectedValue && Array.from(select.options).some(opt => opt.value === selectedValue)) {
            select.value = selectedValue;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function prepareTransaction(type, cryptoName) {
    const select = document.getElementById('cryptoSelect');
    const option = Array.from(select.options).find(opt => opt.dataset.nom === cryptoName);
    if (option) {
        document.getElementById('transactionType').value = type;
        select.value = option.value;
        document.getElementById('quantity').value = '';
        document.getElementById('quantity').focus();
    }
}

// Event Listeners
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('transactionType').value;
    const cryptoId = parseInt(document.getElementById('cryptoSelect').value);
    const quantity = parseFloat(document.getElementById('quantity').value);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/CryptoTransaction/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: userId,
                cryptoId: cryptoId,
                quantite: quantity
            })
        });

        const result = await response.json();

        if (response.ok) {
            let message = `
                ${result.message}
                ${type === 'buy' ? 'Coût total' : 'Montant reçu'}: ${(result.cout || result.montant_recu).toFixed(2)}€
                Ancien solde: ${result.ancien_solde.toFixed(2)}€
                Nouveau solde: ${result.nouveau_solde.toFixed(2)}€`;

            if (result.ancien_solde_crypto !== undefined) {
                message += `
                Ancien solde crypto: ${result.ancien_solde_crypto.toFixed(6)}
                Nouveau solde crypto: ${result.nouveau_solde_crypto.toFixed(6)}`;
            }

            alert(message);
            loadPortfolio();
        } else {
            let errorMessage = 'Erreur: ';
            if (result.message) {
                errorMessage += result.message;
                if (result.details) {
                    if (typeof result.details === 'object') {
                        errorMessage += '\n\nDétails:';
                        for (const [key, value] of Object.entries(result.details)) {
                            errorMessage += `\n${key.replace(/_/g, ' ')}: ${typeof value === 'number' ? value.toFixed(6) : value}`;
                        }
                    } else {
                        errorMessage += `\n\nDétails: ${result.details}`;
                    }
                }
            } else {
                errorMessage += 'Une erreur inattendue est survenue';
            }
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert(`Erreur lors de la transaction: ${error.message}`);
    }
});

// Initialisation et mise à jour périodique
document.addEventListener('DOMContentLoaded', loadUserInfo);
setInterval(() => {
    if (userId) {
        loadPortfolio();
        loadCryptoList(); // Ajout de la mise à jour des prix dans le select
    }
}, 10000);

