// ── Cloudflare Pages Function : réception webhooks Stripe ──
// Route : POST /api/webhook
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY       — clé secrète Stripe
//   STRIPE_WEBHOOK_SECRET   — secret du webhook Stripe (whsec_...)
//   BREVO_API_KEY           — clé API Brevo (xkeysib-...)
//   GOOGLE_SCRIPT_URL       — URL Apps Script (mise à jour ligne Sheet)

import Stripe from 'stripe';

// ── Constantes Brevo ──
const BREVO_LIST_PILOTE_INSCRITES = 4;   // pilote-inscrites-mai-2026
const BREVO_TEMPLATE_BIENVENUE    = 2;   // ADK-Pilote-01-Bienvenue

export async function onRequestPost({ request, env }) {
  // ── Initialisation Stripe ──
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  // ── Lecture du body brut (nécessaire pour la vérification de signature) ──
  const body      = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.warn('[webhook] Header stripe-signature manquant.');
    return new Response(JSON.stringify({ error: 'Signature manquante.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Vérification de la signature (version async obligatoire pour Workers) ──
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook] Signature invalide :', err.message);
    return new Response(JSON.stringify({ error: `Signature invalide : ${err.message}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Traitement des événements ──
  try {
    switch (event.type) {

      // ────────────────────────────────────────────────────────────────────────
      // Session Checkout complétée
      // ────────────────────────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`[webhook] checkout.session.completed — session ${session.id} — mode ${session.mode}`);

        // 1️⃣ Limitation du nombre d'échéances pour les abonnements (2x / 3x)
        if (session.mode === 'subscription') {
          await cappSubscriptionSchedule(stripe, session);
        }

        // 2️⃣ Routage métier — uniquement pour le Programme Pilote
        if (session.metadata?.product === 'groupe_pilote') {
          await handlePiloteInscription(stripe, session, env);
        }

        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Facture payée avec succès (chaque échéance mensuelle)
      // ────────────────────────────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const montant = (invoice.amount_paid / 100).toFixed(2);
        console.log(
          `[webhook] Échéance payée — facture ${invoice.id} — ${montant} € — client ${invoice.customer}`
        );
        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Échec de paiement
      // ────────────────────────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const montant = (invoice.amount_due / 100).toFixed(2);
        console.error(
          `[webhook] ALERTE — Échec de paiement — facture ${invoice.id} — ${montant} € — client ${invoice.customer}`
        );
        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Abonnement résilié (fin du schedule ou annulation manuelle)
      // ────────────────────────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log(
          `[webhook] Fin d'abonnement — ${subscription.id} — client ${subscription.customer} — raison : ${subscription.cancellation_details?.reason || 'non précisée'}`
        );
        break;
      }

      default:
        console.log(`[webhook] Événement non géré : ${event.type}`);
    }
  } catch (err) {
    // Ne pas retourner 500 — Stripe retenterait indéfiniment.
    console.error(`[webhook] Erreur lors du traitement de ${event.type} :`, err);
  }

  // ── Accusé de réception systématique ──
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Limitation automatique du nombre d'échéances (2x / 3x)
// ────────────────────────────────────────────────────────────────────────────
async function cappSubscriptionSchedule(stripe, session) {
  const installments = parseInt(session.metadata?.installments || '0', 10);
  if (!installments || installments < 2) {
    console.warn('[webhook] installments absent ou invalide, schedule non créé.');
    return;
  }

  const subscriptionId = session.subscription;
  console.log(`[webhook] Création d'un SubscriptionSchedule pour ${subscriptionId} (${installments} échéances)`);

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'cancel',
    phases: [
      {
        start_date: schedule.phases[0].start_date,
        items:       schedule.phases[0].items,
        iterations:  installments,
      },
    ],
  });

  console.log(`[webhook] SubscriptionSchedule ${schedule.id} configuré (${installments} échéances).`);
}

// ────────────────────────────────────────────────────────────────────────────
// Route Programme Pilote — Sheet + Brevo contact + Brevo email transactionnel
// ────────────────────────────────────────────────────────────────────────────
async function handlePiloteInscription(stripe, session, env) {
  const email = (session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!email) {
    console.error('[webhook][pilote] Email client introuvable sur la session.');
    return;
  }

  const plan         = session.metadata?.plan || '1x';
  const installments = parseInt(session.metadata?.installments || '1', 10);
  const amountCents  = (session.amount_total || 0) * (session.mode === 'subscription' ? installments : 1);
  const amountEur    = (amountCents / 100).toFixed(2);
  const dateIso      = new Date().toISOString();

  // Formatage adresse de facturation (collectée par Stripe Checkout)
  const addr = session.customer_details?.address || {};
  const adresseLignes = [
    addr.line1,
    addr.line2,
    [addr.postal_code, addr.city].filter(Boolean).join(' '),
    addr.country,
  ].filter(Boolean);
  const adresse = adresseLignes.join(', ');

  console.log(`[webhook][pilote] Inscription — ${email} — plan ${plan} — total ${amountEur} €${adresse ? ` — ${adresse}` : ''}`);

  // ── 1) Mise à jour Google Sheet + récupération du prénom ──
  let prenom = '';
  let nom    = '';
  try {
    const sheetResp = await fetch(env.GOOGLE_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:            'update_payment',
        email,
        plan,
        montant:           Number(amountEur),
        date_paiement_iso: dateIso,
        adresse,
      }),
    });

    if (sheetResp.ok) {
      const data = await sheetResp.json().catch(() => ({}));
      prenom = (data.prenom || '').trim();
      nom    = (data.nom    || '').trim();
      console.log(`[webhook][pilote] Sheet update OK — prénom récupéré : ${prenom || '(non trouvé)'}`);
    } else {
      const text = await sheetResp.text().catch(() => '');
      console.error(`[webhook][pilote] Sheet update KO — ${sheetResp.status} ${text}`);
    }
  } catch (err) {
    console.error('[webhook][pilote] Erreur appel Apps Script :', err);
  }

  // Fallback prénom si Sheet n'a rien trouvé (cas improbable : paiement sans questionnaire)
  if (!prenom) {
    const fullName = (session.customer_details?.name || '').trim();
    prenom = fullName.split(/\s+/)[0] || 'Bonjour';
  }

  // ── 2) Upsert contact Brevo + ajout à la liste inscrites ──
  try {
    const brevoResp = await fetch('https://api.brevo.com/v3/contacts', {
      method:  'POST',
      headers: {
        'api-key':      env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept':       'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: {
          PRENOM:           prenom,
          NOM:              nom,
          DATE_INSCRIPTION: dateIso.slice(0, 10), // YYYY-MM-DD
          PLAN_PILOTE:      plan,
          MONTANT_PILOTE:   Number(amountEur),
        },
        listIds:        [BREVO_LIST_PILOTE_INSCRITES],
        updateEnabled:  true,
      }),
    });

    if (!brevoResp.ok) {
      const text = await brevoResp.text().catch(() => '');
      console.error(`[webhook][pilote] Brevo contact KO — ${brevoResp.status} ${text}`);
    } else {
      console.log(`[webhook][pilote] Brevo contact OK — ${email} ajouté à liste #${BREVO_LIST_PILOTE_INSCRITES}`);
    }
  } catch (err) {
    console.error('[webhook][pilote] Erreur API Brevo contact :', err);
  }

  // ── 3) Envoi de l'email transactionnel de bienvenue ──
  try {
    const mailResp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'api-key':      env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept':       'application/json',
      },
      body: JSON.stringify({
        to:         [{ email, name: prenom }],
        templateId: BREVO_TEMPLATE_BIENVENUE,
        params: {
          PRENOM:  prenom,
          PLAN:    plan,
          MONTANT: amountEur,
        },
      }),
    });

    if (!mailResp.ok) {
      const text = await mailResp.text().catch(() => '');
      console.error(`[webhook][pilote] Brevo email KO — ${mailResp.status} ${text}`);
    } else {
      console.log(`[webhook][pilote] Email bienvenue envoyé à ${email} (template #${BREVO_TEMPLATE_BIENVENUE}).`);
    }
  } catch (err) {
    console.error('[webhook][pilote] Erreur API Brevo email :', err);
  }
}
