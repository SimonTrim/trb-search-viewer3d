# PRD - Plugin 1 : Recherche et Filtrage des Objets dans Trimble Connect

## 1. Contexte et Objectifs
**Objectif :** Remplacer le processus natif complexe de filtrage (qui nécessite 6 étapes via le "Tableau de données") par une interface intuitive directement connectée à la vue 3D[cite: 1].
**Valeur attendue :** Accélérer l'accès à l'information, rendre les chargés de projets (MOA) autonomes dans la consultation des maquettes et réduire les risques d'erreur[cite: 1].

## 2. Stack Technique
*   **UI/UX :** Trimble MODUS 2.0 (Web Components, CSS classes, typographie).
*   **API Principale :** Trimble Connect Workspace API (interaction avec la visionneuse 3D, sélection d'objets, modification de la visibilité, extraction des PSETs)[cite: 1].
*   **SDK :** `trimble-connect-sdk` (NPM)[cite: 1].

## 3. Spécifications Fonctionnelles

### 3.1. Menu Contextuel 3D
*   **Déclencheur :** Clic droit sur un objet dans la visionneuse 3D[cite: 2].
*   **Actions requises dans le menu :**
    *   *Aller à :* Zoom centré sur l'objet sélectionné[cite: 2].
    *   *Montrer/Cacher :* Bascule de visibilité de l'objet, afficher seulement la sélection, montrer tous les espaces[cite: 2].
    *   *Navigation par niveau :* Montrer seulement cet étage, montrer les étages supérieurs, montrer les étages inférieurs[cite: 2].
    *   *Sélection intelligente :* Sélectionner les éléments du même niveau, sélectionner la fratrie ayant le même type (ex: tous les IfcSpace de l'étage)[cite: 2].

### 3.2. Barre de Recherche Avancée
*   **UI :** Champ de recherche type "Search Input" (MODUS 2.0) avec menu déroulant pour choisir le critère[cite: 2].
*   **Critères de recherche :**
    *   Recherche par `Name` (sensible ou non à la casse)[cite: 2].
    *   Recherche par propriétés spécifiques IDFM : `Properties/IDFM_IDENTIFIANT/THEMATIQUE`, `CATEGORIE`, ou `TYPE_OBJET`[cite: 2].
*   **Action :** Le résultat doit lister les éléments trouvés (ex: 19 éléments trouvés avec leur Type IfcSpace)[cite: 2]. Sélectionner un résultat doit l'isoler et le coloriser dans la vue 3D[cite: 2].

### 3.3. Module de Filtre Hiérarchique
*   **UI :** Panneau latéral de filtres à cases à cocher (Checkboxes)[cite: 2].
*   **Fonctionnement :**
    *   Niveau 1 : Filtrage par Type d'objet (ex: isoler uniquement `IfcSpace`, `IfcColumn`, `IfcDoor`)[cite: 2].
    *   Niveau 2 : Filtre combiné (Type + Propriété)[cite: 2]. Possibilité d'ajouter des règles (ex : `Name` = valeur, `Description` = valeur)[cite: 2].

## 4. Instructions d'implémentation (Cursor)
*   Utilisez `extension.ui.addView()` pour enregistrer le panneau latéral.
*   Interceptez les événements de clic dans le viewer via la méthode `viewer.on('selectionChanged', callback)` ou équivalent dans la Workspace API.
*   Gérez l'isolation visuelle en utilisant les méthodes de coloration et de modification de transparence (`viewer.setColors()`, `viewer.setVisibility()`) pour estomper les éléments non concernés par la recherche.