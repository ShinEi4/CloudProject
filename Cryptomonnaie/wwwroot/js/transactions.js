let currentPage = 1;
const pageSize = 10;

async function loadTransactions(page = 1) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/Home/Login';
            return;
        }

        const typeFilter = document.getElementById('typeFilter').value;
        const userFilter = document.getElementById('userFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        const sortOrder = document.getElementById('sortOrder').value;

        let url = new URL('/api/TransactionHistory', window.location.origin);
        url.searchParams.append('page', page);
        url.searchParams.append('pageSize', 10);
        
        if (typeFilter) url.searchParams.append('type', typeFilter);
        if (userFilter) url.searchParams.append('userId', userFilter);
        if (sortBy) url.searchParams.append('sortBy', sortBy);
        if (sortOrder) url.searchParams.append('sortOrder', sortOrder);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        data.transactions.forEach(transaction => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(transaction.date).toLocaleString()}</td>
                <td>${transaction.type === 'BUY' ? 'Achat' : 'Vente'}</td>
                <td>${transaction.username}</td>
                <td>${transaction.crypto}</td>
                <td>${transaction.quantite.toFixed(6)}</td>
                <td>${transaction.prix_unitaire.toFixed(2)}€</td>
                <td>${transaction.montant_total.toFixed(2)}€</td>
                <td>${transaction.is_validate ? 
                    '<span class="badge bg-success">Validé</span>' : 
                    '<span class="badge bg-warning">En attente</span>'}</td>
            `;
            tbody.appendChild(tr);
        });

        updatePagination(data.currentPage, data.totalPages);
        document.getElementById('pageInfo').textContent = 
            `Page ${data.currentPage} sur ${data.totalPages} (${data.totalCount} transactions)`;
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors du chargement des transactions');
    }
}

function updatePagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // Bouton précédent
    const prevButton = document.createElement('button');
    prevButton.className = `btn btn-outline-primary${currentPage === 1 ? ' disabled' : ''}`;
    prevButton.innerHTML = '&laquo; Précédent';
    prevButton.onclick = () => currentPage > 1 && loadTransactions(currentPage - 1);
    pagination.appendChild(prevButton);

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 2 && i <= currentPage + 2)
        ) {
            const pageButton = document.createElement('button');
            pageButton.className = `btn btn-outline-primary${i === currentPage ? ' active' : ''}`;
            pageButton.textContent = i;
            pageButton.onclick = () => loadTransactions(i);
            pagination.appendChild(pageButton);
        } else if (
            i === currentPage - 3 || 
            i === currentPage + 3
        ) {
            const ellipsis = document.createElement('button');
            ellipsis.className = 'btn btn-outline-primary disabled';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }

    // Bouton suivant
    const nextButton = document.createElement('button');
    nextButton.className = `btn btn-outline-primary${currentPage === totalPages ? ' disabled' : ''}`;
    nextButton.innerHTML = 'Suivant &raquo;';
    nextButton.onclick = () => currentPage < totalPages && loadTransactions(currentPage + 1);
    pagination.appendChild(nextButton);
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/User', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        const select = document.getElementById('userFilter');
        select.innerHTML = '<option value="">Tous les utilisateurs</option>';

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (${user.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/Home/Login';
}


// Event Listeners
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadTransactions(1);
});

// Initialisation
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

document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    loadUsers();
    loadTransactions();
});

