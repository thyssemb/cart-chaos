# CART CHAOS

Party game arcade 3D, multijoueur, dans le navigateur. Deux à six joueurs, trois minutes, un caddie chacun.

Grab it. Steal it. Checkout.

## Prérequis

- Node.js 20 ou plus (testé avec Node.js 22)
- npm 10

## Lancer en local

Deux fenêtres du même navigateur sur la même adresse suffisent : l’une crée le salon, l’autre entre le code.

```bash
cd cart-chaos
npm install
npm run dev
```

Ouvre ensuite **http://localhost:5173**

- Client Vite : http://localhost:5173
- Serveur Socket.IO : http://localhost:3001
- Santé du serveur : http://localhost:3001/health

Le client proxyfie `/socket.io` vers le serveur. Tu n’as pas besoin d’ouvrir le port 3001 dans le navigateur pour jouer.

`npm run dev` démarre le client et le serveur ensemble. Ctrl+C arrête les deux.

## Build et production locale

```bash
npm run build
npm start
```

`npm start` sert le client construit et Socket.IO sur **http://localhost:3001**.

## Tests

```bash
npm run test
npm run typecheck
npm run lint
```

## Contrôles

- ZQSD ou WASD, Shift sprinter, Espace sauter
- Souris : caméra (clic pour capturer le pointeur)
- E ramasser / déposer / voler (maintenir) / caisse
- F saisir ou lâcher le caddie
- Clic gauche bousculer
- Échap pause locale (la manche continue)

## Documents

- [Règles](docs/GAME_RULES.md)
- [Protocole réseau](docs/NETWORK.md)
- [Licences des assets](docs/ASSET_LICENSES.md)

## Limites connues

- Les décors, personnages et caddies sont de la géométrie procédurale, pas des modèles Kenney ou Quaternius.
- La caméra se tourne au clic (pointer lock). Sans clic, ZQSD avance selon l’orientation actuelle.
- La physique des articles dans le caddie est un placement fixe, pas une simulation de chaque objet.
- Le son est synthétisé. Le navigateur peut le bloquer jusqu’au premier clic.
- Pas de test Playwright dans ce dépôt. Les règles et un parcours Socket.IO à deux clients sont couverts par Vitest.
