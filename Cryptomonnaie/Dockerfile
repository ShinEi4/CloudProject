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
EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "Cryptomonnaie.dll"]
