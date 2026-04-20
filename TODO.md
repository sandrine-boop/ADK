# TODO — Au-delà des kilos

*Roadmap opérationnelle. Mise à jour en fin de session quand une tâche est ajoutée, faite ou repriorisée.*

*Dernière mise à jour : 20 avril 2026*

---

## 🔥 Urgent — avant le 14 mai (démarrage Pilote)

### Intégration Brevo (non commencée)

- [ ] Créer une clé API Brevo et la stocker en `BREVO_API_KEY` dans Cloudflare Pages.
- [ ] Vérifier le domaine `audeladeskilos.com` dans Brevo (SPF + DKIM via Cloudflare DNS).
- [ ] Écrire le déclencheur Brevo dans `functions/api/webhook.js` à la réception d’un `checkout.session.completed` pour `product=groupe_pilote` :
  - Email de confirmation immédiat (lien Meet permanent + ICS 8 séances + audio cadeau + coordonnées).
- [ ] Programmer dans Brevo la séquence de pré-démarrage : J+1 bienvenue, J-7 rappel, J-3 préparation, J-1 récap, J-0 (2h avant) rappel final.
- [ ] Programmer séquence post-programme : J+2 (clôture + témoignage), J+10 (upsell Libération/Silhouette/Nouveau Moi).
- [ ] Séquence abandon questionnaire : capture progressive + relance J+1.

### Google Sheet inscrites Pilote

- [ ] Confirmer que le webhook Stripe ajoute une ligne au Sheet (le questionnaire y va déjà via Apps Script, mais le paiement ?).

### Pages de sortie bienveillante du tunnel Pilote

- [ ] Créer la page **sortie TCA sévère** (message empathique + orientation suivi médical, pas de relance commerciale).
- [ ] Créer la page **sortie engagement** (invitation session septembre 2026, opt-in liste dédiée).

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
- [ ] 28 avril - 11 mai — stories de vente quotidiennes (3-5/jour)
- [ ] 11 mai minuit — clôture early bird

---

## 💡 Idées / plus tard

*À faire quand le Pilote est vendu et rentabilisé.*

- Page "témoignages" dédiée (25 témoignages classés en tiers).
- Intégration podcast sur le site.
- Section FAQ enrichie sur chaque page accompagnement.

---

*Règle : toute nouvelle tâche structurante identifiée en session atterrit ici avant la fin de la conversation.*
