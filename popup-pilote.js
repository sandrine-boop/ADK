(function () {
  // ── Helpers cookie ──
  function getCookie(name) {
    return document.cookie.split('; ').find(function (r) { return r.startsWith(name + '='); });
  }
  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
  }

  // ── Vérifications fréquence ──
  if (getCookie('adk_popup_dismissed')) return;
  if (sessionStorage.getItem('adk_popup_shown')) return;

  var isMobile = window.innerWidth < 768;

  // ── CSS ──
  var style = document.createElement('style');
  style.textContent = [
    /* Overlay desktop */
    '.adk-overlay{position:fixed;inset:0;z-index:9000;background:rgba(44,36,32,0.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity 0.3s ease;pointer-events:none;}',
    '.adk-overlay.visible{opacity:1;pointer-events:all;}',

    /* Card desktop */
    '.adk-card{background:#FAF6F1;border-radius:24px;box-shadow:0 32px 80px -20px rgba(44,36,32,0.28);max-width:460px;width:100%;overflow:hidden;transform:translateY(12px);transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);position:relative;}',
    '.adk-overlay.visible .adk-card{transform:translateY(0);}',
    '.adk-card-accent{height:4px;background:linear-gradient(90deg,#7A4A5A,#B8906F);}',
    '.adk-card-body{padding:36px 40px 40px;}',

    /* Fermer desktop */
    '.adk-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border:none;background:rgba(44,36,32,0.06);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#2C2420;font-size:16px;line-height:1;transition:background 0.2s;}',
    '.adk-close:hover{background:rgba(44,36,32,0.12);}',

    /* Eyebrow */
    '.adk-eyebrow{font-family:"Outfit",sans-serif;font-size:0.68rem;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#7A4A5A;margin:0 0 14px;}',

    /* Titre */
    '.adk-title{font-family:"Cormorant Garamond","Playfair Display",Georgia,serif;font-size:clamp(1.5rem,3.5vw,2rem);font-weight:400;line-height:1.2;color:#2C2420;margin:0 0 14px;}',
    '.adk-title em{font-style:italic;color:#B8906F;}',

    /* Sous-titre */
    '.adk-sub{font-family:"Outfit",sans-serif;font-size:0.88rem;color:rgba(44,36,32,0.65);line-height:1.6;margin:0 0 28px;}',
    '.adk-sub strong{color:#2C2420;font-weight:600;}',
    '.adk-sub s{color:rgba(44,36,32,0.4);}',

    /* Bouton principal */
    '.adk-btn{display:inline-flex;align-items:center;justify-content:center;width:100%;padding:16px 24px;background:#7A4A5A;color:#FAF6F1;border-radius:999px;font-family:"Outfit",sans-serif;font-size:0.92rem;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:none;cursor:pointer;transition:background 0.25s,transform 0.2s;margin-bottom:14px;}',
    '.adk-btn:hover{background:#6a3a4a;transform:translateY(-1px);}',

    /* Lien discret */
    '.adk-dismiss{display:block;text-align:center;font-family:"Outfit",sans-serif;font-size:0.78rem;color:rgba(44,36,32,0.42);cursor:pointer;background:none;border:none;width:100%;padding:0;transition:color 0.2s;}',
    '.adk-dismiss:hover{color:rgba(44,36,32,0.7);}',

    /* ── Bandeau mobile ── */
    '.adk-banner{position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#FAF6F1;border-top:1px solid rgba(44,36,32,0.08);box-shadow:0 -8px 32px -8px rgba(44,36,32,0.18);padding:16px 20px 20px;transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);}',
    '.adk-banner.visible{transform:translateY(0);}',
    '.adk-banner-accent{height:3px;background:linear-gradient(90deg,#7A4A5A,#B8906F);border-radius:999px;margin-bottom:14px;width:40px;}',
    '.adk-banner-close{position:absolute;top:12px;right:14px;width:28px;height:28px;border:none;background:rgba(44,36,32,0.06);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#2C2420;transition:background 0.2s;}',
    '.adk-banner-close:hover{background:rgba(44,36,32,0.12);}',
    '.adk-banner-title{font-family:"Cormorant Garamond","Playfair Display",Georgia,serif;font-size:1.15rem;font-weight:400;line-height:1.25;color:#2C2420;margin:0 0 6px;padding-right:32px;}',
    '.adk-banner-title em{font-style:italic;color:#B8906F;}',
    '.adk-banner-sub{font-family:"Outfit",sans-serif;font-size:0.78rem;color:rgba(44,36,32,0.6);margin:0 0 14px;line-height:1.5;}',
    '.adk-banner-sub strong{color:#2C2420;}',
    '.adk-banner-row{display:flex;gap:10px;align-items:center;}',
    '.adk-banner-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;background:#7A4A5A;color:#FAF6F1;border-radius:999px;font-family:"Outfit",sans-serif;font-size:0.82rem;font-weight:600;text-decoration:none;transition:background 0.25s;}',
    '.adk-banner-btn:hover{background:#6a3a4a;}',
    '.adk-banner-dismiss{font-family:"Outfit",sans-serif;font-size:0.75rem;color:rgba(44,36,32,0.42);cursor:pointer;background:none;border:none;white-space:nowrap;transition:color 0.2s;}',
    '.adk-banner-dismiss:hover{color:rgba(44,36,32,0.65);}',
  ].join('');
  document.head.appendChild(style);

  // ── HTML ──
  var el = document.createElement('div');

  if (isMobile) {
    el.className = 'adk-banner';
    el.innerHTML =
      '<button class="adk-banner-close" aria-label="Fermer">✕</button>' +
      '<div class="adk-banner-accent"></div>' +
      '<p class="adk-banner-title">Et si cet été, vous vous sentiez <em>enfin bien</em> dans votre corps&nbsp;?</p>' +
      '<p class="adk-banner-sub">Programme pilote · 21 mai – 9 juillet · En visio · <strong>5 places à 247€</strong></p>' +
      '<div class="adk-banner-row">' +
        '<a class="adk-banner-btn" href="/accompagnements/groupe-pilote.html">Je découvre →</a>' +
        '<button class="adk-banner-dismiss">Non merci</button>' +
      '</div>';
  } else {
    el.className = 'adk-overlay';
    el.innerHTML =
      '<div class="adk-card">' +
        '<div class="adk-card-accent"></div>' +
        '<div class="adk-card-body">' +
          '<button class="adk-close" aria-label="Fermer">✕</button>' +
          '<p class="adk-eyebrow">Programme Groupe Pilote · Printemps 2026</p>' +
          '<h2 class="adk-title">Et si cet été, vous vous sentiez <em>enfin bien</em> dans votre corps&nbsp;?</h2>' +
          '<p class="adk-sub">' +
            'Du 21 mai au 9 juillet · En visio · 8 séances en groupe<br>' +
            '<strong>5 places early bird à 247€</strong> <s>297€</s>' +
          '</p>' +
          '<a class="adk-btn" href="/accompagnements/groupe-pilote.html">Je découvre le programme →</a>' +
          '<button class="adk-dismiss">Non merci, pas cette fois</button>' +
        '</div>' +
      '</div>';
  }

  document.body.appendChild(el);

  // ── Affichage ──
  var shown = false;
  function show() {
    if (shown) return;
    shown = true;
    sessionStorage.setItem('adk_popup_shown', '1');
    requestAnimationFrame(function () {
      el.classList.add('visible');
    });
  }

  // ── Fermeture ──
  function dismiss(setCook) {
    el.classList.remove('visible');
    if (setCook) setCookie('adk_popup_dismissed', '1', 7);
    setTimeout(function () { el.remove(); }, 350);
  }

  // Boutons fermer
  var closeBtn = el.querySelector('.adk-close, .adk-banner-close');
  var dismissBtn = el.querySelector('.adk-dismiss, .adk-banner-dismiss');
  if (closeBtn) closeBtn.addEventListener('click', function () { dismiss(true); });
  if (dismissBtn) dismissBtn.addEventListener('click', function () { dismiss(true); });

  // Clic overlay desktop (hors card)
  if (!isMobile) {
    el.addEventListener('click', function (e) {
      if (e.target === el) dismiss(true);
    });
  }

  // ── Déclencheurs ──
  var timer = setTimeout(function () { show(); }, 20000);

  // Exit intent desktop
  if (!isMobile) {
    document.addEventListener('mouseleave', function handler(e) {
      if (e.clientY <= 0) {
        clearTimeout(timer);
        show();
        document.removeEventListener('mouseleave', handler);
      }
    });
  }
})();
