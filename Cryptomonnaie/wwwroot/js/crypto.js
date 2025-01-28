function updateCryptoPrices() {
    fetch('/api/crypto/prices')
        .then(response => response.json())
        .then(data => {
            data.forEach(crypto => {
                const progressBar = document.querySelector(`[data-crypto="${crypto.crypto}"]`);
                if (progressBar) {
                    // Mettre à jour la classe CSS en fonction de la variation
                    progressBar.className = `progress-bar ${crypto.cssClass}`;
                    
                    // Mettre à jour la largeur de la barre
                    progressBar.style.width = `${crypto.percentage}%`;
                    progressBar.setAttribute('aria-valuenow', crypto.percentage);
                    
                    // Mettre à jour le texte
                    const textElement = progressBar.closest('form').querySelector('.fw-bold span');
                    if (textElement) {
                        textElement.textContent = `${crypto.percentage.toFixed(1)}% - Prix: ${crypto.prix.toFixed(2)}€ (${crypto.variation > 0 ? '+' : ''}${crypto.variation.toFixed(2)}%)`;
                    }
                }
            });
        })
        .catch(error => console.error('Erreur:', error));
}

// Mettre à jour toutes les 10 secondes
setInterval(updateCryptoPrices, 10000);

// Première mise à jour
updateCryptoPrices(); 