// ── Cloudflare Pages Function : soumission du questionnaire groupe pilote ──
// Route : POST /api/submit-questionnaire
//
// Variables d'environnement requises dans Cloudflare Pages :
//   GOOGLE_SCRIPT_URL  — URL du Google Apps Script déployé en web app
//                        (ex: https://script.google.com/macros/s/XXXXXXX/exec)
//
// Le Apps Script gère :
//   • L'enregistrement dans Google Sheets
//   • L'envoi de l'email de notification à Sandrine (via GmailApp)
//   • L'envoi de l'email de confirmation à la candidate

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    // ── Lecture du body ──
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Corps de la requête invalide (JSON attendu).');
    }

    // ── Validation des champs obligatoires ──
    const required = ['prenom', 'nom', 'email', 'rapport_nourriture', 'deja_essaye', 'pourquoi'];
    for (const field of required) {
      if (!body[field] || String(body[field]).trim().length === 0) {
        return jsonError(400, `Champ obligatoire manquant : ${field}`);
      }
    }

    // Format email basique
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return jsonError(400, 'Adresse e-mail invalide.');
    }

    // Blocage automatique si suivi médical TCA déclaré
    if (body.suivi_medical === 'oui') {
      return jsonError(400, 'Profil non éligible : suivi médical pour TCA déclaré.');
    }

    // Disponibilité obligatoire
    if (!body.disponibilite) {
      return jsonError(400, 'La disponibilité n\'a pas été confirmée.');
    }

    // ── Vérification de la variable d'environnement ──
    if (!env.GOOGLE_SCRIPT_URL) {
      console.error('[submit-questionnaire] Variable GOOGLE_SCRIPT_URL manquante.');
      return jsonError(500, 'Configuration serveur incomplète. Veuillez nous contacter directement.');
    }

    // ── Envoi vers Google Apps Script ──
    const payload = {
      prenom:            String(body.prenom).trim(),
      nom:               String(body.nom).trim(),
      email:             String(body.email).trim().toLowerCase(),
      telephone:         String(body.telephone || '').trim(),
      age:               String(body.age || '').trim(),
      rapport_nourriture:String(body.rapport_nourriture).trim(),
      deja_essaye:       String(body.deja_essaye).trim(),
      pourquoi:          String(body.pourquoi).trim(),
      suivi_medical:     body.suivi_medical === 'non' ? 'Non' : 'Oui',
      disponibilite:     body.disponibilite ? 'Oui' : 'Non',
      date_soumission:   new Date().toISOString(),
    };

    let scriptResponse;
    try {
      scriptResponse = await fetch(env.GOOGLE_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch (fetchErr) {
      console.error('[submit-questionnaire] Erreur fetch Apps Script :', fetchErr);
      return jsonError(502, 'Impossible de joindre le serveur de traitement. Veuillez réessayer dans quelques instants.');
    }

    if (!scriptResponse.ok) {
      const text = await scriptResponse.text().catch(() => '');
      console.error('[submit-questionnaire] Apps Script error :', scriptResponse.status, text);
      return jsonError(502, 'Erreur lors de l\'enregistrement de votre candidature. Veuillez réessayer.');
    }

    // ── Succès ──
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err) {
    console.error('[submit-questionnaire] Erreur inattendue :', err);
    return jsonError(500, 'Une erreur inattendue est survenue. Veuillez réessayer ou nous contacter directement.');
  }
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
