// ── Cloudflare Pages Function : réception webhooks Stripe ──
// Route : POST /api/webhook
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY       — clé secrète Stripe
//   STRIPE_WEBHOOK_SECRET   — secret du webhook Stripe (whsec_...)

import Stripe from 'stripe';

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

        // Traitement uniquement pour les abonnements (2x / 3x)
        if (session.mode === 'subscription') {
          const installments = parseInt(session.metadata?.installments || '0', 10);

          if (!installments || installments < 2) {
            console.warn('[webhook] Nombre d\'échéances manquant ou invalide dans les metadata.');
            break;
          }

          const subscriptionId = session.subscription;
          console.log(`[webhook] Création d'un SubscriptionSchedule pour l'abonnement ${subscriptionId} (${installments} échéances)`);

          // Étape 1 : Créer le schedule à partir de l'abonnement existant
          const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscriptionId,
          });

          // Étape 2 : Limiter le schedule au nombre d'échéances voulu
          // puis l'annuler automatiquement (end_behavior: 'cancel')
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

          console.log(`[webhook] SubscriptionSchedule ${schedule.id} configuré pour ${installments} échéances — fin automatique.`);
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
        // TODO : envoyer un email de confirmation au client
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
        // TODO : envoyer un email d'alerte au client et à l'administrateur
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
        // TODO : mettre à jour la base de données / accès client si applicable
        break;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Événement non géré (loggé silencieusement)
      // ────────────────────────────────────────────────────────────────────────
      default:
        console.log(`[webhook] Événement non géré : ${event.type}`);
    }
  } catch (err) {
    // Ne pas retourner 500 ici — Stripe retenterait indéfiniment.
    // On logue l'erreur et on répond 200 pour accuser réception.
    console.error(`[webhook] Erreur lors du traitement de ${event.type} :`, err);
  }

  // ── Accusé de réception systématique ──
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
