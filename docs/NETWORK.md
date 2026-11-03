# Protocole réseau

Socket.IO. Le serveur est autoritaire pour les salons, le chrono, les joueurs, les produits, les caddies, les vols, les caisses et les scores. Le client envoie des intentions, jamais une position ni un score.

## Connexion

En développement, le client est sur `http://localhost:5173` et proxyfie `/socket.io` vers `http://127.0.0.1:3001`. En `npm start`, les deux sont sur le port 3001.

## Client → serveur

| Événement | Charge | Réponse |
| --- | --- | --- |
| `create` | `{ name, colorId?, faceId?, accessory? }` | ack `{ ok, playerId, token, code, state }` |
| `join` | `{ name, code, colorId?, faceId?, accessory? }` | ack |
| `rejoin` | `{ code, token }` | ack |
| `ready` | | ack |
| `look` | `{ colorId, faceId, accessory }` | ack, salon ou résultats |
| `chat` | `{ text }` | ack, salon seulement, 80 caractères, 3 messages / 5 s |
| `color` | `{ colorId }` | ack |
| `start` | | ack, hôte, joueurs connectés prêts. Depuis le salon, le compte à rebours se passe sur la place, puis tout le monde apparaît dans le magasin |
| `rematch` | | ack, même règle, compte à rebours déjà dans le magasin |
| `back` | | ack, hôte, depuis les résultats : tout le groupe revient sur la place |
| `emote` | `{ emote: wave \| dance }` | ack, salon seulement |
| `leave` | | ack |
| `input` | `{ seq, forward, strafe, yaw, sprint, jump, interactHeld }` | sans ack, plafond 40/s. `yaw` est le cap horizontal de la caméra. Le salon et la manche utilisent le même pas |
| `action` | `{ type: interact \| grab \| shove, targetId?, ray? }` | ack, plafond 16/s. Pour ramasser, `targetId` est le produit surligné et `ray` le regard. Le serveur ne prend que si ce produit est devant ce regard, à portée, et pas masqué |

Les pseudos font 3 à 16 caractères après nettoyage. Les codes salon font 4 caractères. Les couleurs, visages et accessoires inconnus sont ignorés ou refusés. Le chat du salon coupe les balises, refuse le vide et bloque au-delà de 3 messages en 5 secondes. Un salon plein (6) est refusé. La manche ne démarre que si chaque joueur connecté est prêt.

## Serveur → client

`state` : snapshot à 20 Hz.

- `phase`, `round`, `timeLeftMs`, `endsAt`, `serverNow`
- `players` : pose, liste, score, visage, accessoire, objet porté, caddie tenu, progression de vol, emote (`wave`, `dance` ou `null`)
- `products` : id stable, type, état (`shelf`, `ground`, `carried`, `cart`, `validated`, `hidden`)
- `carts` : pose et `itemIds`
- `chats` : messages du salon (id, pseudo, texte)
- `notices` : textes (vol, légendaire, score), cible éventuelle
- `sfx` : identifiants croissants pour jouer un son une seule fois

Le client interpole les autres joueurs et prédit le sien avec le même pas de déplacement que le serveur (`stepAvatar`), puis se recale si l’écart dépasse 2,4 m.

Le jeton de reconnexion est gardé dans `sessionStorage` (un onglet = un joueur).
