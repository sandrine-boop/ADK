// ── Cal.com iframe popup — Au-delà des kilos ──
// Ouvre le calendrier Cal.eu dans une modale sans quitter le site.
// Usage : ajouter data-cal-url="https://cal.eu/..." sur n'importe quel lien ou bouton.

(function () {

  // ── Styles ──
  const style = document.createElement('style');
  style.textContent = `
    .cal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(44, 36, 32, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .cal-overlay.open { display: flex; }
    .cal-modal {
      background: #fff;
      border-radius: 24px;
      overflow: hidden;
      width: 100%;
      max-width: 920px;
      height: min(88vh, 720px);
      position: relative;
      box-shadow: 0 40px 80px -20px rgba(44, 36, 32, 0.35);
      display: flex;
      flex-direction: column;
      animation: calFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
    }
    @keyframes calFadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .cal-modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 10;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(44, 36, 32, 0.08);
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2C2420;
      transition: background 0.2s;
    }
    .cal-modal-close:hover { background: rgba(44, 36, 32, 0.16); }
    .cal-iframe {
      width: 100%;
      flex: 1;
      border: none;
    }
    @media (max-width: 600px) {
      .cal-modal { height: 92vh; border-radius: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ── Injection de la modale dans le DOM ──
  const overlay = document.createElement('div');
  overlay.className = 'cal-overlay';
  overlay.id = 'calOverlay';
  overlay.innerHTML = `
    <div class="cal-modal" role="dialog" aria-modal="true" aria-label="Réserver un créneau">
      <button class="cal-modal-close" id="calClose" aria-label="Fermer">✕</button>
      <iframe class="cal-iframe" id="calIframe" src="" allow="camera; microphone; payment" loading="lazy"></iframe>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Fermeture sur clic extérieur ──
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeCal();
  });

  // ── Fermeture sur bouton ✕ ──
  document.getElementById('calClose').addEventListener('click', closeCal);

  // ── Fermeture sur touche Echap ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCal();
  });

  // ── Interception des clics sur [data-cal-url] (délégation, fonctionne avec éléments dynamiques) ──
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-cal-url]');
    if (el) {
      e.preventDefault();
      openCal(el.getAttribute('data-cal-url'));
    }
  });

})();

// ── API publique ──
function openCal(url) {
  document.getElementById('calIframe').src = url;
  document.getElementById('calOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCal() {
  document.getElementById('calOverlay').classList.remove('open');
  // Petit délai avant de vider l'iframe pour éviter un flash de rechargement
  setTimeout(function () {
    document.getElementById('calIframe').src = '';
  }, 300);
  document.body.style.overflow = '';
}
