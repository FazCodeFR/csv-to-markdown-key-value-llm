# CSV to Markdown Converter for LLM

Outil de conversion de fichiers CSV en Markdown structuré (clé/valeur), optimisé pour l'ingestion par des modèles de langage (LLM), systèmes RAG et chatbots.

## Aperçu

Cette application web légère permet de transformer vos fichiers CSV en documents Markdown lisibles et structurés, facilitant leur utilisation dans des pipelines d'intelligence artificielle.

## Fonctionnalités

- Import de fichiers CSV par clic ou glisser-déposer
- Conversion de plusieurs fichiers simultanément
- Détection automatique du délimiteur (virgule, point-virgule, tabulation, pipe)
- Configuration du nombre de colonnes pour le titre (1 à 5)
- Option pour masquer les champs vides
- Copie du résultat dans le presse-papiers
- Téléchargement individuel des fichiers Markdown générés
- Statistiques détaillées (entrées, colonnes, taille, caractères)

## Format de sortie

Chaque ligne du CSV est convertie en bloc Markdown :

    # Valeur Colonne 1 - Valeur Colonne 2
    **Colonne 3 :** Valeur
    **Colonne 4 :** Valeur
    **Colonne 5 :** Valeur
    
    ---

Les colonnes sélectionnées pour le titre ne sont pas répétées dans le corps du bloc.

## Utilisation

### En ligne
Ouvrez le fichier index.html dans votre navigateur ou hébergez-le sur n'importe quel serveur web statique (GitHub Pages, Netlify, Vercel...).

### En local
Double-cliquez simplement sur le fichier index.html pour l'ouvrir dans votre navigateur par défaut. Aucune installation requise.

## Technologies

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (Vanilla)
- PapaParse (parsing CSV)

## Installation

1. Clonez le repository
2. Ouvrez index.html dans votre navigateur

Aucune dépendance serveur, aucun build nécessaire.

## Cas d'usage

- Préparation de données pour des systèmes RAG (Retrieval-Augmented Generation)
- Création de bases de connaissances pour chatbots
- Formatage de données pour fine-tuning de modèles
- Documentation structurée à partir de données tabulaires

## Licence

MIT

## Auteur

LYVOC
