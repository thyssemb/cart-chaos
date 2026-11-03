# Licences des assets

Les rayons, le sol, les caisses, les caddies et les personnages sont de la géométrie Three.js originale, avec des textures canvas générées au lancement. Visages, casquette et lunettes sont dessinés dans le même style. Banane, pain, œufs, surgelé, papier toilette et PQ doré restent aussi en géométrie originale : le pack alimentaire n’a pas de maillage utilisable pour ces articles (cartes plates, ou maillages SketchUp de plusieurs centaines de milliers de triangles).

Aucun fichier GLB Kenney, Quaternius, Poly Haven ou itch.io n’est inclus.

## Produits alimentaires

Lait, fromage, céréales et bouteille viennent du modèle « Food pack ».

- Titre : Food pack
- Auteur : Pasha (https://sketchfab.com/Pasha-)
- Licence : Creative Commons Attribution 4.0 (http://creativecommons.org/licenses/by/4.0/)
- Source : https://sketchfab.com/3d-models/food-pack-195c0c0d23e14e4693c640b16734714c
- Identifiant : 195c0c0d23e14e4693c640b16734714c

Le fichier d’origine `apps/client/public/assets/models/food_pack.glb` est le GLB 1k publié par l’auteur. Le jeu charge `food_products.glb`, produit par `tools/trim-food-pack.py` : seuls les maillages du lait Gloria, du beurre Manteiga da Fonte, des céréales Sucrilhos et de la bouteille de ketchup sont gardés, recentrés et mis à l’échelle. Les arêtes SketchUp et les gros maillages inutiles sont écartés. Les textures de ces quatre produits sont conservées. Le build de production ne copie pas le GLB d’origine.

## Police

Fredoka, distribuée par le paquet npm `@fontsource/fredoka`.

- Auteur : Google Fonts / Eduardo Tunni
- Licence : SIL Open Font License 1.1
- Source du paquet : https://fontsource.org/fonts/fredoka

## Audio

Musique de menu, musique de manche, ambiance de magasin et effets sont synthétisés dans le navigateur avec l’API Web Audio (oscillateurs et bruit). Aucun fichier audio tiers. Si le navigateur bloque l’autoplay, le jeu reste jouable après un clic. Les volumes général, musique et effets sont enregistrés dans le navigateur.
