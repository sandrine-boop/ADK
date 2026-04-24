# TODO — Au-delà des kilos

*Roadmap opérationnelle. Mise à jour en fin de session quand une tâche est ajoutée, faite ou repriorisée.*

*Dernière mise à jour : 24 avril 2026*

---

## ✅ Tunnel paiement Pilote — état actuel (24 avril 2026)

Référence du parcours client complet : [CLAUDE.md section 7](CLAUDE.md) + [docs/parcours-client-pilote.svg](docs/parcours-client-pilote.svg).

### Ce qui tourne déjà (testé en local avec Stripe mode test le 24 avril)

- **Questionnaire** `/questionnaire-pilote.html` → écrit une ligne dans le Google Sheet « Pilote Mai 26 » + envoie un email `[ADK] Nouvelle candidature Pilote` à `sandrine@audeladeskilos.com`.
- **Mémorisation identité** : à la soumission, le navigateur stocke `email + prénom + nom` en `sessionStorage` pour les transmettre à Stripe.
- **Checkout Stripe** (`/checkout.html`) → crée un Customer Stripe avec ces infos → l'email est **pré-rempli et verrouillé** sur l'Embedded Checkout (la cliente ne peut plus le modifier).
- **Adresse de facturation obligatoire** sur les 4 offres (`billing_address_collection: 'required'`) — conformité facture > 25 €.
- **Paiement 1x / 2x / 3x** : `payment` en une fois pour 1x, `subscription` limité via `SubscriptionSchedule` pour 2x et 3x (arrêt automatique après 2 ou 3 prélèvements, jamais d'infini).
- **Webhook** `/api/webhook` (signature Stripe vérifiée) sur `checkout.session.completed` avec `product === 'groupe_pilote'` :
  1. Appelle l'Apps Script `update_payment` → marque la ligne Sheet comme payée (colonnes Payée, Date paiement, Plan, Montant, Adresse) + renvoie prénom + nom.
  2. Upsert contact Brevo → attributs (PRENOM, NOM, DATE_INSCRIPTION, PLAN_PILOTE, MONTANT_PILOTE) + ajout à la **liste #4 `pilote-inscrites-mai-2026`** → déclenche l'automation Brevo pré-démarrage.
  3. Envoi de l'email transactionnel **template #2 `ADK-Pilote-01-Bienvenue`** à la cliente.
- **Apps Script déployé** en « Application Web » sous `sandrine@audeladeskilos.com`, exécution « Moi », accès « Tout le monde ». URL stockée dans `GOOGLE_SCRIPT_URL`.
- **Infra locale de dev** : `wrangler pages dev` + `stripe listen` + `.dev.vars` (gitignoré, clés test seulement).

### Variables Cloudflare Pages (à vérifier avant la prod)

- [ ] `GOOGLE_SCRIPT_URL` → mettre la **nouvelle URL** (celle actuellement dans `.dev.vars`, qui pointe vers le déploiement actif « v3 Brevo integration »).
- [ ] `STRIPE_WEBHOOK_SECRET` → vérifier qu'il s'agit bien du secret du webhook **enregistré en mode LIVE** dans le dashboard Stripe (endpoint : `https://audeladeskilos.com/api/webhook`). **Ne pas** copier celui du `.dev.vars` (qui vient de `stripe listen`, valable uniquement en local).
- [x] `BREVO_API_KEY` — déjà à jour.
- [x] `STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` en `pk_live_…` / `sk_live_…`.
- [x] `BASE_URL = https://audeladeskilos.com`.

---

## 🔥 Urgent — avant le 21 mai (démarrage Pilote)

### Actifs à préparer (par Sandrine, hors code)

- [x] Générer le **lien Google Meet permanent** pour les 8 jeudis (20h-21h30, 21 mai → 9 juillet).
- [x] Créer le **fichier ICS** des 8 séances (format calendrier universel, ajout en 1 clic).
- [ ] Enregistrer / finaliser l'**audio cadeau de bienvenue** (format mp3, hébergé où ? Cloudflare R2 ou site ?).
- [x] Vérifier que le **template Brevo #2** `ADK-Pilote-01-Bienvenue` intègre bien : lien Meet + ICS + audio + coordonnées + variables `{{ contact.PRENOM }}`, `{{ params.PLAN }}`, `{{ params.MONTANT }}`.
- [x] Rédiger les **5 emails de la séquence pré-démarrage** (J+1 bienvenue enrichi, J-7 rappel, J-3 prépa séance 1, J-1 récap, J-0 rappel final 2h avant) + **campagne Brevo configurée**.
- [x] Rédiger les **2 emails post-programme** (J+2 clôture émotionnelle + demande de témoignage, J+10 upsell individuel).
- [ ] Rédiger l'email de **relance abandon questionnaire** (J+1 liste #6).

### Questionnaire — sauvegarde progressive (abandon avant fin)

- [ ] Décision à prendre : implémenter ou pas la sauvegarde progressive (stockage partiel prénom+email dès l'étape 2 pour relancer les abandons via liste Brevo #6) ? Pas bloquant pour démarrer — peut attendre la v2 si le tunnel actuel convertit correctement.

### Pages de sortie bienveillante du tunnel

- [ ] Créer la page **sortie TCA sévère** (message empathique + orientation suivi médical, **pas** d'opt-in Brevo).
- [ ] Créer la page **sortie engagement** (invitation session septembre 2026, opt-in explicite vers liste Brevo #5 `pilote-session-septembre-2026`).

### Invitation WhatsApp (manuelle, par Sandrine)

- [ ] J-2 (mardi 19 mai au soir) : créer le groupe WhatsApp, inviter les 6 inscrites via numéros collectés dans le questionnaire.

### Blog — 4 articles à publier

Les 4 fichiers du dossier `Blog/` sont modifiés non committés et prêts à publier :
- [ ] `Blog/anneau-gastrique-virtuel.html`
- [ ] `Blog/hypnose-perte-de-poids.html`
- [ ] `Blog/index.html`
- [ ] `Blog/kilos-emotionnels-hypnose.html`

→ À vérifier puis commit + push quand Sandrine dit « Publie ».

---

## 🛠 Dette technique

- [x] Créer un `.gitignore` (fait le 24 avril : `.dev.vars`, `.env*`, `node_modules/`, `.wrangler/`, `Marketing ADK/`, `Programme Pilote Mai 26/`, `.DS_Store`, captures).
- [x] Vérifier que `webhook.js` valide bien la signature Stripe avant de traiter l'événement (fait, `constructEventAsync` ligne 37).
- [ ] Restreindre le CORS des Functions (`Access-Control-Allow-Origin: *` → `https://audeladeskilos.com`) en production. Impact faible pour l'instant, mais à faire avant publication presse/grande audience.
- [ ] Surveiller les **cas limites** du webhook en prod : email Stripe ≠ email questionnaire (aujourd'hui le Customer Stripe verrouille l'email, mais si la cliente passe par un parcours hors tunnel — ex : relance manuelle, lien de paiement direct — le webhook ne trouvera pas la ligne Sheet et loguera `email_not_found`).

---

## 📅 Calendrier éditorial Instagram (lancement Pilote)

- [x] 19 avril — Post 1 publié
- [ ] 20-27 avril — 9 posts fondateurs, 1/jour à 19h30 (les 9 sont prêts et planifiés dans Meta Business Suite, **3 reels restent à tourner** : Posts 2, 5, 8)
- [ ] 28 avril - 18 mai — stories de vente quotidiennes (3-5/jour)
- [ ] 18 mai minuit — clôture early bird

---

## 💡 Idées / plus tard

*À faire quand le Pilote est vendu et rentabilisé.*

- Sheet « Ventes » centralisé pour tous les produits (alimenté par webhook Stripe, avec nom + email + adresse + plan + montant + date), pour éviter l'export CSV manuel à chaque clôture comptable.
- Page « témoignages » dédiée (25 témoignages classés en tiers).
- Intégration podcast sur le site.
- Section FAQ enrichie sur chaque page accompagnement.
- Sauvegarde progressive du questionnaire avec relance abandon J+1.

---

*Règle : toute nouvelle tâche structurante identifiée en session atterrit ici avant la fin de la conversation.*
