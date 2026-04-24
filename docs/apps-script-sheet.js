// ─────────────────────────────────────────────────────────────────────────────
// Google Apps Script — Sheet « Inscriptions Pilote »
// ─────────────────────────────────────────────────────────────────────────────
//
// À COPIER-COLLER intégralement dans l'éditeur Apps Script (script.google.com)
// puis déployer en tant que « Application Web » (Execute as : moi — Who has
// access : Anyone). Conserver la MÊME URL de déploiement (GOOGLE_SCRIPT_URL).
//
// Gère 2 actions :
//   • submit_questionnaire — nouvelle ligne + email notif Sandrine + confirmation
//   • update_payment       — cherche la ligne par email, coche Payée, renvoie le prénom
//
// Rétrocompatibilité : si aucun champ `action` n'est fourni, le script traite
// par défaut comme un submit_questionnaire (comportement d'origine).
//
// ─────────────────────────────────────────────────────────────────────────────

// ── CONFIG — ajuster si les noms de colonnes diffèrent dans le Sheet ──
const SHEET_NAME = 'Pilote Mai 26'; // onglet à cibler ; null = onglet actif

const COL = {
  email:         'Email',
  prenom:        'Prénom',
  nom:           'Nom',
  telephone:     'Téléphone',
  age:           'Âge',
  rapport:       'Rapport à la nourriture',
  deja_essaye:   'Déjà essayé',
  pourquoi:      'Pourquoi',
  suivi_medical: 'Suivi médical',
  disponibilite: 'Disponibilité',
  date_soumis:   'Date soumission',
  // Colonnes paiement (ajoutées le 21 avril 2026)
  payee:         'Payée',
  date_paiement: 'Date paiement',
  plan:          'Plan',
  montant:       'Montant',
  adresse:       'Adresse', // Ajoutée le 24 avril 2026 — obligation facture > 25 €
};

const ADMIN_EMAIL = 'sandrine@audeladeskilos.com'; // destinataire notif nouvelle candidate


// ─────────────────────────────────────────────────────────────────────────────
// Point d'entrée HTTP
// ─────────────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'submit_questionnaire';

    if (action === 'update_payment') {
      return updatePayment(body);
    }
    if (action === 'submit_questionnaire') {
      return submitQuestionnaire(body);
    }
    return jsonResponse({ success: false, error: `action inconnue : ${action}` }, 400);

  } catch (err) {
    console.error('doPost erreur :', err);
    return jsonResponse({ success: false, error: String(err) }, 500);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Action : submit_questionnaire — écrit une nouvelle ligne + envoie 2 emails
// ─────────────────────────────────────────────────────────────────────────────
function submitQuestionnaire(body) {
  const sheet = getSheet();
  const headers = getHeaders(sheet);

  // Construction de la ligne dans le bon ordre des colonnes
  const rowMap = {
    [COL.email]:         body.email,
    [COL.prenom]:        body.prenom,
    [COL.nom]:           body.nom,
    [COL.telephone]:     body.telephone,
    [COL.age]:           body.age,
    [COL.rapport]:       body.rapport_nourriture,
    [COL.deja_essaye]:   body.deja_essaye,
    [COL.pourquoi]:      body.pourquoi,
    [COL.suivi_medical]: body.suivi_medical,
    [COL.disponibilite]: body.disponibilite,
    [COL.date_soumis]:   formatDateFr(new Date()),
  };

  const row = headers.map(h => rowMap[h] !== undefined ? rowMap[h] : '');
  sheet.appendRow(row);

  // Email notif à Sandrine (pour voir les candidatures en temps réel,
  // relancer manuellement si abandon avant paiement)
  try {
    GmailApp.sendEmail(
      ADMIN_EMAIL,
      `[ADK] Nouvelle candidature Pilote — ${body.prenom} ${body.nom}`,
      [
        `Prénom : ${body.prenom}`,
        `Nom : ${body.nom}`,
        `Email : ${body.email}`,
        `Téléphone : ${body.telephone || '—'}`,
        `Âge : ${body.age || '—'}`,
        ``,
        `Rapport à la nourriture :`,
        body.rapport_nourriture,
        ``,
        `Déjà essayé :`,
        body.deja_essaye,
        ``,
        `Pourquoi :`,
        body.pourquoi,
      ].join('\n')
    );
  } catch (err) {
    console.error('notif Sandrine KO :', err);
  }

  // Pas d'email de confirmation Gmail à la candidate : le parcours enchaîne
  // directement sur le paiement Stripe. L'email de bienvenue Brevo (template
  // #2) est envoyé par le webhook après confirmation de paiement.

  return jsonResponse({ success: true });
}


// ─────────────────────────────────────────────────────────────────────────────
// Action : update_payment — cherche la ligne par email, écrit les 4 colonnes
// paiement, et renvoie le prénom + nom pour que le webhook puisse appeler Brevo.
// ─────────────────────────────────────────────────────────────────────────────
function updatePayment(body) {
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) {
    return jsonResponse({ success: false, error: 'email_missing' }, 400);
  }

  const sheet = getSheet();
  const headers = getHeaders(sheet);
  const data = sheet.getDataRange().getValues();

  const iEmail         = headers.indexOf(COL.email);
  const iPrenom        = headers.indexOf(COL.prenom);
  const iNom           = headers.indexOf(COL.nom);
  const iPayee         = headers.indexOf(COL.payee);
  const iDatePaiement  = headers.indexOf(COL.date_paiement);
  const iPlan          = headers.indexOf(COL.plan);
  const iMontant       = headers.indexOf(COL.montant);
  const iAdresse       = headers.indexOf(COL.adresse);

  if (iEmail === -1) {
    return jsonResponse({ success: false, error: `colonne ${COL.email} introuvable` }, 500);
  }

  // Recherche de la ligne (ligne 1 = headers, donc on démarre à 1)
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][iEmail] || '').trim().toLowerCase();
    if (rowEmail === email) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    // Cas : paiement sans questionnaire préalable (rare mais possible)
    console.warn(`updatePayment : email ${email} introuvable dans le Sheet.`);
    return jsonResponse({ success: false, error: 'email_not_found' });
  }

  const row = data[rowIndex];
  const rowNumber = rowIndex + 1; // 1-indexed pour setValue

  // Écriture des 4 colonnes paiement (si elles existent)
  const dateIso = body.date_paiement_iso || new Date().toISOString();
  const dateFr  = formatDateFr(new Date(dateIso));

  if (iPayee         !== -1) sheet.getRange(rowNumber, iPayee + 1).setValue('oui');
  if (iDatePaiement  !== -1) sheet.getRange(rowNumber, iDatePaiement + 1).setValue(dateFr);
  if (iPlan          !== -1) sheet.getRange(rowNumber, iPlan + 1).setValue(body.plan || '');
  if (iMontant       !== -1) sheet.getRange(rowNumber, iMontant + 1).setValue(Number(body.montant) || 0);
  if (iAdresse       !== -1 && body.adresse) sheet.getRange(rowNumber, iAdresse + 1).setValue(String(body.adresse));

  return jsonResponse({
    success: true,
    prenom:  iPrenom !== -1 ? String(row[iPrenom] || '') : '',
    nom:     iNom    !== -1 ? String(row[iNom]    || '') : '',
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (SHEET_NAME) {
    const s = ss.getSheetByName(SHEET_NAME);
    if (!s) throw new Error(`Onglet introuvable : ${SHEET_NAME}`);
    return s;
  }
  return ss.getActiveSheet();
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(h => String(h).trim());
}

function formatDateFr(date) {
  // Ex : "21/04/2026 14:22"
  return Utilities.formatDate(date, 'Europe/Paris', 'dd/MM/yyyy HH:mm');
}

function jsonResponse(obj, status) {
  // ContentService ne permet pas de fixer le statut HTTP, mais on renvoie
  // toujours un JSON lisible et un champ `success` exploitable côté Worker.
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
