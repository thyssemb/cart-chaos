# Protocole réseau

Socket.IO. Le serveur est autoritaire pour les salons, le chrono, les joueurs, les produits, les caddies, les vols, les caisses et les scores. Le client envoie des intentions, jamais une position ni un score.

## Connexion

En développement, le client est sur `http://localhost:5173` et proxyfie `/socket.io` vers `http://127.0.0.1:3001`. En `npm start`, les deux sont sur le port 3001.

## Client → serveur

| Événement | Charge | Réponse |
| --- | --- | --- |
| `create` | `{ name }` | ack `{ ok, playerId, token, code, state }` |
| `join` | `{ name, code }` | ack |
| `rejoin` | `{ code, token }` | ack |
| `ready` | | ack |
| `color` | `{ colorId }` | ack |
| `start` | | ack, hôte, au moins 1 joueur |
| `rematch` | | ack, même règle |
| `leave` | | ack |
| `input` | `{ seq, forward, strafe, yaw, sprint, jump, interactHeld }` | sans ack, plafond 40/s |
| `action` | `{ type: interact \| grab \| shove }` | ack, plafond 16/s |

Les noms sont nettoyés (14 caractères). Les codes salon font 4 caractères. Les couleurs inconnues et les actions hors phase sont refusées. Un salon plein (6) est refusé.

## Serveur → client

`state` : snapshot à 20 Hz.

- `phase`, `round`, `timeLeftMs`, `endsAt`, `serverNow`
- `players` : pose, liste, score, objet porté, caddie tenu, progression de vol
- `products` : id stable, type, état (`shelf`, `ground`, `carried`, `cart`, `validated`, `hidden`)
- `carts` : pose et `itemIds`
- `notices` : textes (vol, légendaire, score), cible éventuelle
- `sfx` : identifiants croissants pour jouer un son une seule fois

Le client interpole les autres joueurs et prédit le sien avec le même pas de déplacement que le serveur (`stepAvatar`), puis se recale si l’écart dépasse 2,4 m.

Le jeton de reconnexion est gardé dans `sessionStorage` (un onglet = un joueur).
