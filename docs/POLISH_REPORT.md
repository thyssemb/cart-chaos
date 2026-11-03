# Phase 1.5 — polish

Le prototype n’a pas été réécrit. Le multijoueur Socket.IO, les règles de manche et le salon restent ceux du MVP. Pas de Chaos Events.

## Implémenté

### Déplacements

Un seul contrôleur cinématique, partagé par le serveur et la prédiction client (`stepAvatar`). Rapier ne déplace pas les personnages : il ne sert que de collision statique visuelle. Deux simulateurs dynamiques se seraient contredits.

Paramètres dans `CONTROLLER` : `walkSpeed`, `sprintSpeed`, `acceleration`, `deceleration`, `rotationSpeed`, `jumpImpulse`, `airControl`, `gravityScale`, plus une courte coyote time et un verrou de saut.

- L’accélération et le freinage sont progressifs.
- La souris oriente la caméra et la direction voulue. Le corps rattrape cette direction sans demi-tour instantané. À l’arrêt, il garde son cap.
- Le saut a une impulsion, une phase en l’air et un contrôle aérien réduit. Le verrou empêche un second saut tant que le personnage n’a pas atterri.
- Les murs se prennent axe par axe : le personnage glisse au lieu de coller, et la vitesse de l’axe bloqué est amortie.
- Le caddie lâché garde un peu de la vitesse du joueur, ralentit, et rebondit légèrement contre un rayon.

### Animations

Les personnages restent de la géométrie procédurale, pas des modèles skinnés. Il n’y a donc pas d’`AnimationMixer` : les poses (idle, marche, course, saut, chute, atterrissage, poussée, portage, célébration, coup) sont mélangées par lissage, sans redémarrer à chaque frame.

Les autres joueurs utilisent leur pose interpolée (vitesse, sol, caddie, objet porté, coup), pas le clavier local.

### Caméra

La caméra suit la souris, avec un léger décalage d’épaule, une distance lissée et un recul contre les rayons. Le sprint élargit un peu le champ et la distance. Le curseur « Mouvements de caméra » dans les réglages réduit cet effet jusqu’à zéro. Pas de secousse permanente.

### Visuel

Têtes plus grandes, visage avec sourire, chaussures, bras qui avancent sur la poignée, carrelage plus serré, lumière plus chaude, affiches (bananes, promo, caisses, PQ d’or). Aucun asset Kenney, Quaternius ou Mixamo n’a été téléchargé : pas de fichier sous licence tierce ajouté.

### Son

Voir `docs/AUDIO.md`. Volumes général, musique et effets. Pas, roues, ambiance de magasin, musique de menu, de manche et de résultats, bips d’interface.

## Vérifié

- `npm test` : 20 tests, dont accélération, rotation sans demi-tour, mur, limites du magasin, règles, salon et parcours Socket.IO à deux clients.
- `npm run typecheck` et `npm run lint`.
- Captures avant, dans le store : `media/avant-menu.png`, `media/avant-personnage-caddie.png`, `media/avant-supermarche.png`.
- Captures après, deux clients headless sur la scène réelle : `media/menu.png`, `media/lobby-deux-joueurs.png`, `media/partie-hud.png`, `media/personnage-caddie.png`, `media/supermarche.png`. Le personnage, le caddie, les rayons et le HUD sont visibles. Ce n’est pas un test de ressenti au clavier.

Le test Socket.IO couvre créer, rejoindre, départ, déplacement, caisse, déconnexion et relance. Il ne juge pas le plaisir de la caméra ni le mixage audio.

## Pas vérifié à la main

L’environnement de build n’a pas de joueur au clavier dans un navigateur réel. N’ont donc pas été ressentis :

- le confort exact des virages, du sprint et du saut à la souris ;
- le poids du caddie dans une allée étroite ;
- le mix des volumes sur des enceintes ;
- les performances sur un laptop de jeu (pas de mesure de FPS).

## Reste volontairement dehors

- Chaos Events et cartes de sabotage.
- Modèles externes.
- `AnimationMixer` sur un squelette.
- Playwright.
