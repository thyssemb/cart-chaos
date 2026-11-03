# CART CHAOS

Party game arcade 3D, multijoueur, dans le navigateur. Un à six joueurs, trois minutes, un caddie chacun. Tu peux lancer seul pour tester.

Grab it. Steal it. Checkout.

## Prérequis

- Node.js 20 ou plus (testé avec Node.js 22)
- npm 10

## Lancer en local

Une fenêtre suffit : crée le salon, puis lance la manche. Pour jouer à plusieurs, ouvre une deuxième fenêtre sur la même adresse et entre le code.

```bash
cd cart-chaos
npm install
npm run dev
```

Ouvre ensuite **http://localhost:5173**. Choisis un pseudo (3 à 16 caractères), un visage et un accessoire, puis crée ou rejoins un salon. Le salon est une petite place au coucher du soleil : chaque joueur s’y promène avec son avatar. Tout le monde doit être prêt avant que l’hôte lance la manche depuis la place.

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

- ZQSD (AZERTY), WASD (QWERTY) ou les flèches : déplacement relatif à la caméra
- Shift sprinte (environ 60 % plus vite), Espace saute
- Souris : caméra (clic pour capturer le pointeur). Le personnage s’oriente vers l’avant et les côtés. S et flèche bas marchent à reculons sans demi-tour.
- Réglages : volume général, musique, effets, amplitude de la caméra.
- Sur la place : E près du tableau, du miroir, du code ou de la cloche centrale. 1 salue, 2 danse, Entrée ouvre le chat
- E ramasse le produit visé au centre de l’écran (molette pour changer de cible proche), dépose, vole (maintenir) ou passe en caisse
- F saisir ou lâcher le caddie
- Clic gauche bousculer
- Échap pause locale (la manche continue)

## Documents

- [Règles](docs/GAME_RULES.md)
- [Protocole réseau](docs/NETWORK.md)
- [Audio](docs/AUDIO.md)
- [Polish phase 1.5](docs/POLISH_REPORT.md)
- [Licences des assets](docs/ASSET_LICENSES.md)

## Limites connues

- Les décors et les personnages sont de la géométrie procédurale originale. Le caddie est « Cartoon Shopping Cart » d’İlhan Fehimovski (CC BY 4.0). Les emballages viennent du Food pack de Pasha (CC BY 4.0). Le papier toilette reste un rouleau original. Voir [les licences](docs/ASSET_LICENSES.md).
- Le déplacement suit la caméra. Le corps tourne vers l’avant et les côtés, et recule sans se retourner.
- La physique des articles dans le caddie est un placement fixe, pas une simulation de chaque objet.
- Le son est synthétisé. Le navigateur peut le bloquer jusqu’au premier clic.
- Pas de test Playwright dans ce dépôt. Les règles et un parcours Socket.IO à deux clients sont couverts par Vitest.
