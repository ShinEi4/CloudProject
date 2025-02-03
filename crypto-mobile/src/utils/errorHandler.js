export const handleApiError = (error) => {
  if (error.response) {
    // La requête a été faite et le serveur a répondu avec un code d'état
    // qui n'est pas dans la plage 2xx
    return error.response.data.message || 'Une erreur est survenue';
  } else if (error.request) {
    // La requête a été faite mais aucune réponse n'a été reçue
    return 'Impossible de contacter le serveur';
  } else {
    // Une erreur s'est produite lors de la configuration de la requête
    return error.message || 'Une erreur est survenue';
  }
}; 