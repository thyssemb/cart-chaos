# Audio — CART CHAOS

Tout le son est synthétisé dans le navigateur. Aucun fichier audio n’est chargé.

## Bus

- Volume général, musique et effets, enregistrés dans `localStorage` (`cart-chaos-settings`).
- Le contexte audio démarre au premier clic, pour respecter l’autoplay.
- Si l’onglet passe en arrière-plan, le contexte est suspendu.

## Musique

- Menu et salon : boucle légère en triangle et sinus.
- Manche : boucle plus lente, plus un bourdonnement de frigo et un souffle de ventilation.
- Résultats : phrase courte, sans boucle.

## Effets

Les événements de jeu (ramassage, dépôt, vol, bousculade, caisse, légendaire, bonus, collision) arrivent du serveur avec une position. Le client les joue en stéréo selon la position du joueur local. Les sons d’interface (survol, clic, compte à rebours, départ) ne sont pas spatialisés.

Les pas suivent la distance parcourue, plus courts en sprint. Les roues du caddie montent avec la vitesse, avec un grincement occasionnel. Un bip de caisse lointain est joué de temps en temps pendant la manche.

Les sons ne sont pas envoyés sur le réseau : seul l’événement de jeu l’est.
