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
