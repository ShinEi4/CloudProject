function updateCryptoPrices() {
    fetch('/api/crypto/prices')
        .then(response => response.json())
        .then(data => {
            const cryptoList = document.getElementById('cryptoList');
            cryptoList.innerHTML = '';
            
            data.forEach(crypto => {
                const cryptoElement = document.createElement('div');
                cryptoElement.className = 'mb-4';
                cryptoElement.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h4 class="small fw-bold mb-0">${crypto.crypto}</h4>
                        <div class="text-end">
                            <span class="fw-bold">${crypto.prix.toFixed(2)}€</span>
                            <span class="ms-2 ${crypto.variation >= 0 ? 'text-success' : 'text-danger'}">
                                ${crypto.variation >= 0 ? '+' : ''}${crypto.variation.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${crypto.cssClass}" 
                                role="progressbar" 
                                style="width: ${crypto.percentage}%;" 
                                aria-valuenow="${crypto.percentage}" 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                                data-crypto="${crypto.crypto}">
                            ${crypto.percentage.toFixed(1)}%
                        </div>
                    </div>
                `;
                cryptoList.appendChild(cryptoElement);
            });

            // Mettre à jour l'horodatage
            document.getElementById('lastUpdate').textContent = 
                `Dernière mise à jour : ${new Date().toLocaleTimeString()}`;
        })
        .catch(error => {
            console.error('Erreur:', error);
            document.getElementById('cryptoList').innerHTML = `
                <div class="alert alert-danger">
                    Erreur lors de la récupération des données: ${error.message}
                </div>
            `;
        });
}

// Mettre à jour toutes les 10 secondes
setInterval(updateCryptoPrices, 10000);

// Première mise à jour
updateCryptoPrices();

// Ajout de la fonction pour charger les informations de l'utilisateur
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
        document.getElementById('userDisplayName').textContent = userData.username;
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/Home/Login';
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/Home/Login';
}


// Appel de la fonction au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    updateCryptoPrices();
});

