# Étape 1 : Utiliser l'image de base .NET SDK 8.0 pour la compilation
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copier les fichiers projet et restaurer les dépendances
COPY *.csproj ./
RUN dotnet restore

# Copier le reste des fichiers et compiler l'application
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Étape 2 : Utiliser l'image de base ASP.NET Runtime 8.0 pour exécuter l'application
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# S'assurer que le dossier wwwroot existe
RUN mkdir -p /app/wwwroot/Page

# Copier les fichiers statiques
COPY wwwroot /app/wwwroot/

EXPOSE 5000

ENTRYPOINT ["dotnet", "Cryptomonnaie.dll"]
