# CSV to Markdown Converter for LLM

Convertisseur CSV vers Markdown structuré (clé/valeur), optimisé pour LLM, RAG et chatbots.

## Démo

https://fazcodefr.github.io/csv-to-markdown-key-value-llm/

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
    
    ---

Les colonnes sélectionnées pour le titre ne sont pas répétées dans le corps du bloc.

## Utilisation

### En ligne
Accédez à la démo ci-dessus ou hébergez le fichier sur n'importe quel serveur web statique.

### En local
Ouvrez index.html directement dans votre navigateur. Aucune installation requise.

## Technologies

- HTML5 / CSS3 (Tailwind CSS)
- JavaScript (Vanilla)
- PapaParse

## Installation

1. Clonez le repository
2. Ouvrez index.html dans votre navigateur

Aucune dépendance serveur, aucun build nécessaire.

## Cas d'usage

- Préparation de données pour systèmes RAG
- Bases de connaissances pour chatbots
- Formatage pour fine-tuning de modèles
- Documentation structurée depuis données tabulaires

## Licence

MIT
