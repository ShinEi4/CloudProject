// Gestion de l'authentification
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
        return userData;
    } catch (error) {
        console.error('Error:', error);
        window.location.href = '/Home/Login';
    }
} 