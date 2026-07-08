# Recherche d'éléments — Extension Viewer 3D Trimble Connect

Extension panneau latéral pour rechercher et identifier visuellement des éléments BIM dans le Viewer 3D Trimble Connect.

## Stack

- React 19 + TypeScript + Vite 6
- Modus Web Components 2.0 (`@trimble-oss/moduswebcomponents`)
- Workspace API Trimble Connect (CDN)

## Dépôt et hébergement

| Ressource | URL |
|-----------|-----|
| GitHub | https://github.com/SimonTrim/trb-search-viewer3d |
| Vercel (production) | https://trb-search-viewer3d.vercel.app |
| Manifest TC | https://trb-search-viewer3d.vercel.app/manifest.json |
| Icône extension | https://trb-search-viewer3d.vercel.app/icon-48.png |

## Développement local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:5173 — l'interface fonctionne en mode démo sans iframe Trimble Connect.

Manifest dev : http://localhost:5173/manifest.json

## Build

```bash
npm run build
npm run preview
```

## Déploiement (Vercel)

1. Le projet est lié au dépôt GitHub `SimonTrim/trb-search-viewer3d`
2. URL de production : https://trb-search-viewer3d.vercel.app
3. Manifest : https://trb-search-viewer3d.vercel.app/manifest.json
4. Dans Trimble Connect : **Paramètres → Extensions → Ajouter** → URL du manifest

## Structure

- `src/components/SearchBar.tsx` — zone de recherche Modus
- `src/hooks/useTrimbleConnect.ts` — connexion Workspace API
- `src/config/searchProperties.ts` — propriétés recherchables (IDFM configurable via `propertySets.json`)

## Prochaines étapes (PRD)

- Indexation propriétés (`propertyIndex.ts`)
- Service de recherche et actions viewer
- Tableau de résultats paginé
