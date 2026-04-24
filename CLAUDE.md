# CLAUDE.md — Mode d’emploi permanent

*Lu automatiquement par Claude Code au démarrage de chaque session. À maintenir à jour.*

---

## 0. Règles entre Sandrine et moi

- **Tutoiement entre nous.** Intangible.
- **Vouvoiement pour les clientes.** Tout texte visible sur le site, en email, en post, en DM → vouvoiement. Cible femmes 45+. Intangible.
- **Franc, pas complaisant.** Si un texte est mou, une décision risquée, une implémentation fragile, je le dis. Pas de « c’est super Sandrine ».
- **Concis.** Pas de plan en 5 parties quand 3 lignes suffisent.
- **Je demande au lieu de supposer.** Mieux vaut une question que 10 min de correction.
- **Mot-clé de déploiement : « Publie ».** Quand Sandrine écrit « Publie » → je commit, je push sur `main`, Cloudflare Pages (projet `adk`) auto-déploie. Jamais de commit/push sans ce mot (ou un ordre équivalent explicite).

---

## 1. Contexte business (10 lignes)

Sandrine Bartoli, 60 ans, hypnothérapeute spécialisée perte de poids et TCA depuis 2016 (600+ femmes accompagnées en cabinet). Relance 100 % visio sous la marque **Au-delà des kilos** après une rupture pro en 2024-2025. Objectif : 1-2 SMIC net/mois, 4 ans avant la retraite.

**Cible** : femmes 45+, France, péri/ménopause, compulsions et grignotage émotionnel, ont tout essayé.
**Promesse** : perdre du poids durablement par l’hypnose, sans régime, sans privation.

**Les 4 offres** :
- **Programme Pilote** — 247 € early bird (5 places) · 297 € (6ᵉ place) — 8 semaines de groupe visio, jeudis 20h-21h30, du 21 mai au 9 juillet 2026.
- **Libération** — 347 € — accompagnement individuel TCA / compulsions légères.
- **Silhouette Révélée** — 447 € — perte de poids < 10 kg.
- **Nouveau Moi** — 647 € — perte > 10 kg avec pose de l’anneau gastrique virtuel.

Paiement Stripe 1x / 2x / 3x **en production**. Appel offert via Cal.eu. Visio Google Meet.

---

## 2. Stack technique

- **Site statique HTML/CSS/JS** — pas de framework, pas de build step.
- **Hébergement** : Cloudflare Pages, projet `adk`, auto-déploiement sur push `main` (GitHub).
- **Backend** : Cloudflare Pages Functions dans `/functions/api/` (runtime Workers).
- **Paiements** : Stripe Embedded Checkout (SDK `stripe ^16.0.0`). En production.
- **Réservation** : Cal.eu embed (popup) — `cal-embed.js` à la racine.
- **Analytics** : Google Analytics 4 (toutes pages, tracking CTA, questionnaire, achat).
- **Cookies** : Axeptio.
- **Emailing** : Brevo → **pas encore branché**, compte gratuit créé le 20 avril. À intégrer (cf. TODO.md).
- **Questionnaire** : Google Apps Script (Sheet + GmailApp) appelé depuis `/api/submit-questionnaire`.
- **Domaine** : audeladeskilos.com.

### Variables d’environnement Cloudflare Pages

Configurées dans le dashboard Cloudflare (Settings → Environment variables) :

- `STRIPE_PUBLISHABLE_KEY` — clé publique (pk_live_…).
- `STRIPE_SECRET_KEY` — clé secrète (sk_live_…).
- `STRIPE_WEBHOOK_SECRET` — signature webhook.
- `BASE_URL` — `https://audeladeskilos.com`.
- `GOOGLE_SCRIPT_URL` — Apps Script déployé en web app (questionnaire).

---

## 3. Structure du repo

```
/
├── index.html                  # Page d'accueil
├── approche.html               # Mon approche
├── checkout.html               # Stripe embedded checkout
├── success.html                # Confirmation post-paiement
├── cancel.html                 # Retour Stripe annulé
├── questionnaire-pilote.html   # Questionnaire pré-inscription Pilote
├── cgv.html · mentions-legales.html · politique-confidentialite.html
│
├── accompagnements/
│   ├── groupe-pilote.html      # Page de vente Programme Pilote (celle qui convertit)
│   ├── liberation.html         # 347 €
│   ├── silhouette-revelee.html # 447 €
│   └── nouveau-moi.html        # 647 €
│
├── Blog/
│   ├── index.html              # Liste articles
│   ├── anneau-gastrique-virtuel.html
│   ├── hypnose-perte-de-poids.html
│   ├── kilos-emotionnels-hypnose.html
│   └── article-*.md            # Sources markdown (non servies)
│
├── functions/api/              # Cloudflare Pages Functions
│   ├── config.js               # GET /api/config (expose pk Stripe)
│   ├── create-checkout.js      # POST /api/create-checkout (session Stripe)
│   ├── submit-questionnaire.js # POST /api/submit-questionnaire → Apps Script
│   └── webhook.js              # POST /api/webhook (Stripe events)
│
├── AP ADK/                     # Assets images (photos, favicons, hero, logos)
├── cal-embed.js                # Popup Cal.eu embed (inclus sur toutes les pages)
├── popup-pilote.js             # Pop-up conversion Programme Pilote (exit-intent + timer)
├── package.json                # Seule dépendance : stripe ^16.0.0
├── CLAUDE.md · TODO.md         # Mode d'emploi + roadmap
│
└── Marketing ADK/ · Programme Pilote Mai 26/   # Dossiers de travail, non trackés git
```

Pas de React, pas de Next, pas de bundler. Chaque page HTML est autonome avec son CSS inline dans `<style>`.

---

## 4. Commandes

### Dev local (recommandé : wrangler, gère aussi les Functions)

```bash
cd "/Users/Sandrine_1/Library/CloudStorage/OneDrive-Personnel/AU-DELÀ DES KILOS"
npx wrangler pages dev . --port 8080
# → http://localhost:8080 avec /api/* fonctionnels
```

Pour tester les Functions avec les vraies clés Stripe (test mode), créer `.dev.vars` à la racine (ignoré par git) :

```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
BASE_URL=http://localhost:8080
GOOGLE_SCRIPT_URL=...
```

### Dev local rapide (HTML pur, pas les Functions)

```bash
rsync -a "/Users/Sandrine_1/Library/CloudStorage/OneDrive-Personnel/AU-DELÀ DES KILOS/" /tmp/au-dela-des-kilos/
ruby -run -e httpd /tmp/au-dela-des-kilos -p 8080
```

### Déploiement

Sandrine dit « Publie » → je fais :

```bash
git add <fichiers pertinents>   # jamais git add .
git commit -m "..."             # message court, descriptif, en français
git push origin main
```

Cloudflare Pages (projet `adk`) déploie automatiquement en ~1 min.

### Pas de tests

Il n’y a aucun test automatisé. Vérification = relire le rendu en local (wrangler) ou sur preview Cloudflare avant push.

---

## 5. Conventions de code

- **HTML/CSS/JS vanilla.** Pas de framework, pas d’outil de build. Si une nouvelle page est nécessaire, calquer le pattern d’une page existante du même type (ex : nouvelle offre → copier `accompagnements/liberation.html`).
- **CSS inline dans `<style>`** en haut de chaque page. Variables CSS dans `:root`. Pas de CSS externe (sauf polices Google Fonts).
- **JS inline dans `<script>`** en bas de page. Les scripts partagés (Cal, pop-up Pilote) sont externalisés à la racine.
- **Nommage fichiers** : kebab-case (`groupe-pilote.html`, `cal-embed.js`).
- **Pas de dépendances front.** Stripe.js et Cal.eu sont chargés via CDN.
- **Commit messages en français**, courts et descriptifs, à l’impératif ou au passé. Exemples du repo : `Fix questionnaire erreur réelle`, `Ajoute pop-up de conversion groupe pilote`.
- **`git add` sélectif** — jamais `git add .` ou `-A` (risque d’embarquer `Marketing ADK/`, captures, `.DS_Store`).
- **Pas de `.DS_Store`** dans les commits. Si j’en vois, je les retire (le repo n’a pas de `.gitignore`, c’est une faiblesse à corriger — cf. TODO).

### Commentaires

Par défaut : pas de commentaires. N’en écrire que si le **pourquoi** est non évident (contrainte cachée, workaround documenté). Ne jamais expliquer le **quoi** — le code le fait déjà.

---

## 6. Règles éditoriales intangibles

À appliquer à **tout texte visible par une cliente** (site, email, post, DM, légende, slide) :

- **Vouvoiement** partout.
- **Apostrophes courbes** `’` — jamais droites `'`.
- **Guillemets français** `« »` — espace insécable à l’intérieur.
- **Tiret cadratin** `—` — jamais tiret simple `-` dans la prose.
- **Pas de majuscule après virgule.**
- **Verbe « on » toujours sans s** (« on travaille », pas « on travailles »).
- **Ligature `œ` obligatoire** (œstrogènes, œuf, cœur).
- **Nombres en lettres** dans la narration jusqu’à dix · **en chiffres** dans les CTA commerciaux (5 places, 21 mai, 247 €).
- **Jamais « venir me voir »** → visio uniquement (« m’a consultée », ou attaquer direct).
- **Ton** : intimiste, mature, émotionnel sans misérabilisme. Pas de jargon coach anglo-saxon. Phrases courtes. Paragraphes courts.

### Palette Instagram (charte de marque)

Utilisée pour tous les contenus Instagram / Facebook / slides Canva :

- Crème `#F5EDE3` · Brun foncé `#2E2520` · Brun noir `#1F1915` · Brun moyen `#3D332B` · Doré `#B89775`.

### Palette site (distincte, voulue ainsi)

Utilisée sur audeladeskilos.com :

- Ivory `#FAF6F1` · Cream `#F2EBE0` · Sand `#E8DDCB` · Champagne `#D4B896` · Caramel `#B8906F` · Plum `#7A4A5A` · Mocha `#2C2420`.

**Règle** : ne pas confondre les deux. Les contenus Instagram utilisent la palette Instagram, les pages web utilisent la palette site.

### Typographie

- **Site** : Cormorant Garamond (serif, corps) + Outfit (sans, UI). Variables CSS `--serif` et `--sans` dans chaque page.
- **Instagram / Canva** : Cormorant Garamond Regular + Italic (corps) + Inter Bold (eyebrows espacés).
- **Signature marque** : italique dorée sur le mot-clé émotionnel en fin de titre.

---

## 7. Règles métier verrouillées

### Programme Pilote — formulations exactes

Configuration réelle : **6 places · 5 early bird à 247 € jusqu’au 18 mai · 6ᵉ place à 297 €**.

- **Courte** (bio, slide) : « 5 places early bird à 247 € »
- **Moyenne** (légende, CTA) : « 5 places early bird à 247 € jusqu’au 18 mai »
- **Longue** (page de vente) : « 6 places · 5 early bird à 247 € jusqu’au 18 mai · puis 297 € »
- **Jamais « 5 places » seul** (faux).
- **Jamais « 6 places early bird »** (faux).
- **Démarrage** : jeudi 21 mai 2026, 20h. **Fin** : jeudi 9 juillet 2026. **8 séances** de 20h à 21h30.

### CTA

- **Principal partout** : `Réserver mon appel offert →` (lien Cal.eu).
- **Secondaire** : `Découvrir les accompagnements →`.
- **CTA page de vente Pilote** : `Réserver ma place — 247 €` (étape 1 du tunnel).

### Parcours client Programme Pilote (validé 20 avril 2026)

Référence visuelle canonique : [docs/parcours-client-pilote.svg](docs/parcours-client-pilote.svg).

**Tunnel de conversion — 12 étapes :**

1. **Arrivée page de vente** · `audeladeskilos.com/accompagnements/groupe-pilote` (trafic Instagram bio, stories, posts, DM).
2. **CTA cliqué** · « Réserver ma place — 247 € ».
3. **Questionnaire custom** · champs 1-2 = prénom + email (sauvegarde progressive : les réponses partielles sont stockées avec consentement explicite, pour pouvoir relancer les abandons à mi-parcours).
4. **Filtre 1 · TCA sévère** (case à cocher obligatoire : suivi médical anorexie / boulimie sévère).
   - OUI → sortie TCA.
   - NON → suite.
5. **Filtre 2 · Engagement 8 jeudis** (case à cocher : disponible jeudis 20h-21h30 du 21 mai au 9 juillet).
   - NON → sortie engagement.
   - OUI → passage paiement.
6. **Page paiement Stripe** · 1x 247 € · 2x · 3x (fractionné Stripe en production).
7. **Webhook Stripe → tunnel activé** (déclenche les étapes 8-10 automatiquement).
8. **Email de confirmation Brevo** (immédiat) :
   - Lien Google Meet permanent (valable les 8 jeudis).
   - Fichier ICS des 8 séances (ajout calendrier en 1 clic).
   - Audio cadeau de bienvenue.
   - Coordonnées Sandrine.
9. **Ajout automatique Google Sheet inscrites** · base de suivi Sandrine.
10. **Séquence Brevo pré-démarrage** : J+1 bienvenue · J-7 rappel · J-3 prépa séance 1 · J-1 récap · J-0 (2h avant) rappel final avec lien Meet.
11. **Invitation WhatsApp manuelle J-2** · Sandrine crée le groupe et invite les 6 inscrites (échanges libres pendant les 8 semaines).
12. **Démarrage** · jeudi 21 mai, 20h, Google Meet.

**Post-programme** (après le 9 juillet) — 2 emails espacés pour ne pas mélanger émotion et commercial :
- **J+2** après le dernier jeudi · email de clôture émotionnelle + demande de témoignage (pas d'upsell).
- **J+10** · proposition d'accompagnement individuel (Libération / Silhouette Révélée / Nouveau Moi).

Le **bilan individuel de 30 min** (déjà annoncé sur la page de vente) se tient en parallèle — c'est le canal chaud pour l'upsell oral, plus naturel que l'email.

### Sorties bienveillantes du tunnel (3 points)

Designer avec soin — aucune relance commerciale agressive sur aucun des trois :

- **Sortie TCA sévère** (étape 4) · page dédiée · message empathique, orientation suivi médical, **pas d'opt-in Brevo**.
- **Sortie engagement** (étape 5) · page dédiée · message compréhensif, capture email dans la liste « session septembre 2026 » avec accord explicite.
- **Abandon avant paiement** · email Brevo de relance à J+1 (« vous étiez intéressée, une question ? »), puis laisser faire.

---

## 8. Choses à NE PAS faire

*Section à enrichir au fil des sessions quand une erreur se reproduit.*

- Ne jamais tutoyer dans un contenu de marque.
- Ne jamais écrire « 5 places » seul ou « 6 places early bird ».
- Ne jamais promettre de résultat magique (« perdez 10 kg en 2 mois »).
- Ne jamais utiliser de ton coach anglo-saxon (« ta best life », « boss your goals »).
- Ne jamais parler de présentiel / cabinet — visio uniquement.
- Ne jamais utiliser `git add .` ou `-A` dans ce repo (risque `Marketing ADK/`, `.DS_Store`, captures).
- Ne jamais commit ni push sans le mot « Publie » de Sandrine (ou équivalent explicite).
- Ne jamais supposer qu’une intégration tierce est branchée sans vérifier (Brevo en particulier → compte existe, code pas écrit).
- Ne jamais reformuler un CTA verrouillé sans demander.

---

## 9. Ce qui reste à faire

Voir **[TODO.md](TODO.md)** — tenu à jour à chaque session.
