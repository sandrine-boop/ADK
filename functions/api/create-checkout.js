// ── Cloudflare Pages Function : création session Stripe Checkout ──
// Route : POST /api/create-checkout
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY    — clé secrète Stripe (sk_live_... ou sk_test_...)
//   BASE_URL             — URL de base du site (ex: https://audeladeskilos.com)

import Stripe from 'stripe';

// ── Table des prix en centimes ──
const PRIX = {
  liberation: {
    '1x': { montant: 34700, mode: 'payment' },
    '2x': { montant: 18700, mode: 'subscription' },
    '3x': { montant: 12700, mode: 'subscription' },
  },
  silhouette: {
    '1x': { montant: 44700, mode: 'payment' },
    '2x': { montant: 24100, mode: 'subscription' },
    '3x': { montant: 16300, mode: 'subscription' },
  },
  nouveau_moi: {
    '1x': { montant: 64700, mode: 'payment' },
    '2x': { montant: 34900, mode: 'subscription' },
    '3x': { montant: 23300, mode: 'subscription' },
  },
};

// ── Noms affichés dans Stripe Dashboard ──
const NOMS_PRODUITS = {
  liberation:   'Accompagnement Libération',
  silhouette:   'Accompagnement Silhouette Révélée',
  nouveau_moi:  'Accompagnement Nouveau Moi',
};

// ── Headers CORS (accepte tous les origines en dev ; restreindre en prod si besoin) ──
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Handler OPTIONS (preflight CORS) ──
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ── Handler POST ──
export async function onRequestPost({ request, env }) {
  try {
    // Lecture et validation du body JSON
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Corps de la requête invalide (JSON attendu).');
    }

    const { product, plan } = body;

    // Validation du produit
    if (!product || !PRIX[product]) {
      return jsonError(400, `Produit invalide : "${product}". Valeurs acceptées : liberation, silhouette, nouveau_moi.`);
    }

    // Validation du plan
    if (!plan || !PRIX[product][plan]) {
      return jsonError(400, `Plan invalide : "${plan}". Valeurs acceptées : 1x, 2x, 3x.`);
    }

    const { montant, mode } = PRIX[product][plan];
    const nomProduit = NOMS_PRODUITS[product];
    const baseUrl = env.BASE_URL || 'https://audeladeskilos.com';

    // ── Initialisation Stripe (Workers-compatible via fetchHttpClient) ──
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ── Construction de la session Checkout (mode embedded) ──
    let sessionParams = {
      locale: 'fr',
      ui_mode: 'embedded',
      return_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&product=${product}&plan=${plan}`,
    };

    if (mode === 'payment') {
      // ── Paiement unique (1x) ──
      sessionParams = {
        ...sessionParams,
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: montant,
              product_data: {
                name: nomProduit,
                description: `Paiement unique — ${nomProduit}`,
              },
            },
          },
        ],
      };
    } else {
      // ── Abonnement (2x ou 3x) ──
      // Le nombre d'échéances est passé en metadata ; le webhook s'en sert
      // pour créer un SubscriptionSchedule et stopper l'abonnement automatiquement.
      const installments = plan === '2x' ? 2 : 3;

      sessionParams = {
        ...sessionParams,
        mode: 'subscription',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: montant,
              recurring: {
                interval:       'month',
                interval_count: 1,
              },
              product_data: {
                name: nomProduit,
                description: `Paiement en ${plan} — ${nomProduit}`,
              },
            },
          },
        ],
        // Metadata sur la session Checkout
        metadata: {
          product,
          plan,
          installments: String(installments),
        },
        // Metadata propagée à l'objet Subscription créé
        subscription_data: {
          metadata: {
            product,
            plan,
            installments: String(installments),
          },
        },
      };
    }

    // ── Création de la session ──
    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });

  } catch (err) {
    // Erreur Stripe ou inattendue
    console.error('[create-checkout] Erreur :', err);
    const message =
      err?.type?.startsWith('Stripe')
        ? `Erreur Stripe : ${err.message}`
        : 'Une erreur inattendue est survenue. Veuillez réessayer.';
    return jsonError(500, message);
  }
}

// ── Utilitaire : réponse JSON d'erreur ──
function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
