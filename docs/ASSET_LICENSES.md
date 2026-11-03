# Licences des assets

Les rayons, le sol, les caisses, les caddies et les personnages sont de la géométrie Three.js originale, avec des textures canvas générées au lancement. Visages, casquette et lunettes sont dessinés dans le même style. Le papier toilette et le PQ doré restent des rouleaux originaux : le pack n’a pas de rouleau utilisable.

Aucun fichier GLB Kenney, Quaternius, Poly Haven ou itch.io n’est inclus.

## Produits alimentaires

Les aliments interactifs et le remplissage des rayons viennent du modèle « Food pack ».

- Titre : Food pack
- Auteur : Pasha (https://sketchfab.com/Pasha-)
- Licence : Creative Commons Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/)
- Source : https://sketchfab.com/3d-models/food-pack-195c0c0d23e14e4693c640b16734714c
- Identifiant : 195c0c0d23e14e4693c640b16734714c

Le fichier d’origine `apps/client/public/assets/models/food_pack.glb` est le GLB 1k publié par l’auteur. Le jeu charge `food_products.glb`, produit par `tools/trim-food-pack.py`. Les maillages gardés, recentrés et mis à hauteur réelle, sont : brique Gloria (lait), céréales Sucrilhos, beurre Manteiga da Fonte (fromage), bouteille de ketchup (boisson), boîte de flocons d’avoine (pain), pot de marmite (œufs), boîte de corn flakes (banane), boîte de gélatine (surgelé) et paquet de chips (décor des rayons seulement). Le pack ne contient ni pain en tranches, ni œufs, ni banane, ni papier toilette : ces rôles utilisent l’emballage texturé le plus proche, ou un rouleau original pour le papier. Les arêtes SketchUp et les gros maillages inutiles sont écartés. Les textures des produits gardés sont conservées. Le build de production ne copie pas le GLB d’origine.

## Police

Fredoka, distribuée par le paquet npm `@fontsource/fredoka`.

- Auteur : Google Fonts / Eduardo Tunni
- Licence : SIL Open Font License 1.1
- Source du paquet : https://fontsource.org/fonts/fredoka

## Audio

Musique de menu, musique de manche, ambiance de magasin et effets sont synthétisés dans le navigateur avec l’API Web Audio (oscillateurs et bruit). Aucun fichier audio tiers. Si le navigateur bloque l’autoplay, le jeu reste jouable après un clic. Les volumes général, musique et effets sont enregistrés dans le navigateur.
