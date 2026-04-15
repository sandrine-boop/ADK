// ── Cloudflare Pages Function : configuration publique ──
// Route : GET /api/config
// Variable d'environnement requise :
//   STRIPE_PUBLISHABLE_KEY  — clé publique Stripe (pk_live_... ou pk_test_...)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({ publishableKey: env.STRIPE_PUBLISHABLE_KEY }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}
