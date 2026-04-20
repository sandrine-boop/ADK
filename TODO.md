# TODO — Au-delà des kilos

*Roadmap opérationnelle. Mise à jour en fin de session quand une tâche est ajoutée, faite ou repriorisée.*

*Dernière mise à jour : 20 avril 2026*

---

## 🔥 Urgent — avant le 21 mai (démarrage Pilote)

Référence du parcours client complet : [CLAUDE.md section 7](CLAUDE.md) + [docs/parcours-client-pilote.svg](docs/parcours-client-pilote.svg).

### Pré-requis Brevo

- [ ] Créer une clé API Brevo dans le dashboard et la stocker en `BREVO_API_KEY` dans Cloudflare Pages (Environment variables).
- [ ] Vérifier le domaine `audeladeskilos.com` dans Brevo (SPF + DKIM via Cloudflare DNS).
- [ ] Créer dans Brevo les **listes de contacts** nécessaires : `pilote-inscrites-mai-2026`, `pilote-session-septembre-2026` (capture sortie engagement), `abandon-questionnaire`.

### Actifs à préparer (par Sandrine, hors code)

- [ ] Générer le **lien Google Meet permanent** pour les 8 jeudis (20h-21h30, 21 mai → 9 juillet).
- [ ] Créer le **fichier ICS** des 8 séances (format calendrier universel, ajout en 1 clic).
- [ ] Enregistrer / finaliser l'**audio cadeau de bienvenue** (format mp3, hébergé où ? Cloudflare R2 ou site ?).
- [ ] Rédiger les **6 emails de la séquence pré-démarrage** (J+1 bienvenue, J-7 rappel, J-3 prépa, J-1 récap, J-0 rappel final) + les **2 emails post-programme** (J+2 clôture, J+10 upsell).
- [ ] Rédiger l'email de **relance abandon** (J+1 après abandon questionnaire).

### Questionnaire — sauvegarde progressive

- [ ] Auditer `questionnaire-pilote.html` + `functions/api/submit-questionnaire.js` : la sauvegarde progressive (champs prénom+email d'abord, stockage partiel avec consentement) est-elle déjà implémentée ou à faire ?
- [ ] Si absente : ajouter un endpoint `/api/save-questionnaire-progress` qui stocke les réponses partielles dans Brevo (contact + attributs) + déclenche la liste `abandon-questionnaire` si la personne ne termine pas sous 24h.

### Webhook Stripe → tunnel

- [ ] Dans `functions/api/webhook.js`, sur `checkout.session.completed` avec `product=groupe_pilote` :
  - Ajouter une ligne au Google Sheet inscrites Pilote (actuellement seul le questionnaire y écrit, le paiement ne déclenche rien).
  - Appeler l'API Brevo pour ajouter le contact à la liste `pilote-inscrites-mai-2026`.
  - Déclencher l'envoi immédiat de l'email de confirmation (template Brevo avec variables : prénom, lien Meet, ICS, audio, coordonnées).
  - Déclencher l'automation Brevo de pré-démarrage (séquence J+1 → J-0).
- [ ] Vérifier la **signature Stripe** avant tout traitement (sécurité).

### Pages de sortie bienveillante du tunnel

- [ ] Créer la page **sortie TCA sévère** (message empathique + orientation suivi médical, **pas** d'opt-in Brevo).
- [ ] Créer la page **sortie engagement** (invitation session septembre 2026, opt-in explicite vers liste `pilote-session-septembre-2026`).

### Invitation WhatsApp (manuelle, par Sandrine)

- [ ] J-2 (mardi 12 mai au soir) : créer le groupe WhatsApp, inviter les 6 inscrites via numéros collectés dans le questionnaire.

### Blog — 4 articles à publier

Les 4 fichiers du dossier `blog/` sont modifiés non committés et prêts à publier :
- [ ] `blog/anneau-gastrique-virtuel.html`
- [ ] `blog/hypnose-perte-de-poids.html`
- [ ] `blog/index.html`
- [ ] `blog/kilos-emotionnels-hypnose.html`

→ À vérifier puis commit + push quand Sandrine dit « Publie ».

---

## 🛠 Dette technique

- [ ] Créer un `.gitignore` (au minimum : `.DS_Store`, `.dev.vars`, `Marketing ADK/`, `Programme Pilote Mai 26/`, captures d’écran à la racine).
- [ ] Restreindre le CORS des Functions (`Access-Control-Allow-Origin: *`) au seul domaine `audeladeskilos.com` en production.
- [ ] Vérifier que `webhook.js` valide bien la signature Stripe avant de traiter l’événement.

---

## 📅 Calendrier éditorial Instagram (lancement Pilote)

- [x] 19 avril — Post 1 publié
- [ ] 20-27 avril — 9 posts fondateurs, 1/jour à 19h30 (les 9 sont prêts et planifiés dans Meta Business Suite, **3 reels restent à tourner** : Posts 2, 5, 8)
- [ ] 28 avril - 18 mai — stories de vente quotidiennes (3-5/jour)
- [ ] 18 mai minuit — clôture early bird

---

## 💡 Idées / plus tard

*À faire quand le Pilote est vendu et rentabilisé.*

- Page "témoignages" dédiée (25 témoignages classés en tiers).
- Intégration podcast sur le site.
- Section FAQ enrichie sur chaque page accompagnement.

---

*Règle : toute nouvelle tâche structurante identifiée en session atterrit ici avant la fin de la conversation.*
