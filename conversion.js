/* ═══════════════════════════════════════
   10X CONVERSION ELEMENTS
   Auto-injects: Urgency Bar, Sticky CTA,
   Exit-Intent Popup, GTM Tracking
   Drop into any page — zero config needed
═══════════════════════════════════════ */
(function(){
  'use strict';

  var WA = 'https://wa.me/971526455121?text=';
  var PHONE = 'tel:+971526455121';
  var WA_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  var PHONE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

  // ═══ 1. URGENCY BAR ═══
  function injectUrgencyBar() {
    if (sessionStorage.getItem('ub_closed')) return;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var now = new Date();
    var month = months[now.getMonth()];
    var slots = Math.floor(Math.random() * 2) + 2; // 2-3

    var bar = document.createElement('div');
    bar.className = 'urgency-bar';
    bar.innerHTML = '<strong>' + slots + ' project slots remaining</strong> for ' + month + ' start — <a href="/calculator/">Get your free estimate</a>' +
      '<button class="ub-close" aria-label="Close">&times;</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-urgency-bar');

    bar.querySelector('.ub-close').addEventListener('click', function() {
      bar.remove();
      document.body.classList.remove('has-urgency-bar');
      sessionStorage.setItem('ub_closed', '1');
    });
  }

  // ═══ 2. STICKY MOBILE CTA ═══
  function injectStickyCTA() {
    if (document.querySelector('.sticky-mobile-cta')) return;
    var cta = document.createElement('div');
    cta.className = 'sticky-mobile-cta';
    cta.innerHTML =
      '<a href="' + WA + encodeURIComponent('Hi, I\'d like to discuss a renovation project') + '" class="smc-wa" aria-label="WhatsApp us">' + WA_ICON + 'WhatsApp</a>' +
      '<a href="' + PHONE + '" class="smc-call" aria-label="Call us">' + PHONE_ICON + 'Call Now</a>';
    document.body.appendChild(cta);
    document.body.classList.add('has-sticky-cta');
  }

  // ═══ 3. EXIT-INTENT POPUP ═══
  function injectExitPopup() {
    if (sessionStorage.getItem('ep_shown')) return;
    // Don't show on /get-quote/ pages (they have their own)
    if (window.location.pathname.indexOf('/get-quote/') === 0) return;

    var overlay = document.createElement('div');
    overlay.className = 'exit-popup-overlay';
    overlay.innerHTML =
      '<div class="exit-popup">' +
        '<button class="ep-close" aria-label="Close">&times;</button>' +
        '<h3>Before You Go</h3>' +
        '<p>Get a free 3D design concept for your villa — see your renovation before it starts. No obligation.</p>' +
        '<input type="text" id="ep-name" placeholder="Your name" autocomplete="given-name">' +
        '<input type="tel" id="ep-phone" placeholder="WhatsApp number" autocomplete="tel">' +
        '<button class="ep-btn">' + WA_ICON + ' Get My Free Design</button>' +
        '<div class="ep-privacy">We respect your privacy. No spam, ever.</div>' +
        '<div class="ep-social-proof">' +
          '<div class="ep-avatars"><span>S</span><span>A</span><span>M</span><span>R</span></div>' +
          '47 homeowners requested this month' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function showPopup() {
      if (sessionStorage.getItem('ep_shown')) return;
      overlay.classList.add('visible');
      sessionStorage.setItem('ep_shown', '1');
      trackEvent('exit_popup_shown');
    }

    function closePopup() {
      overlay.classList.remove('visible');
    }

    // Desktop: mouse leaves viewport top
    document.addEventListener('mouseout', function(e) {
      if (e.clientY < 5 && !e.relatedTarget && !e.toElement) {
        showPopup();
      }
    });

    // Mobile: scroll up quickly after scrolling down
    var lastScroll = 0;
    var scrolledDown = false;
    window.addEventListener('scroll', function() {
      var current = window.pageYOffset;
      if (current > 600) scrolledDown = true;
      if (scrolledDown && current < lastScroll - 200 && current < 300) {
        showPopup();
      }
      lastScroll = current;
    }, { passive: true });

    // Also show after 45 seconds on page
    setTimeout(function() { showPopup(); }, 45000);

    // Close handlers
    overlay.querySelector('.ep-close').addEventListener('click', closePopup);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closePopup(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePopup(); });

    // Submit handler
    overlay.querySelector('.ep-btn').addEventListener('click', function() {
      var name = document.getElementById('ep-name').value.trim();
      var phone = document.getElementById('ep-phone').value.trim();
      if (!name || !phone) {
        document.getElementById(name ? 'ep-phone' : 'ep-name').style.borderColor = '#f87171';
        return;
      }
      var page = document.title.split('|')[0].split('—')[0].trim();
      var msg = 'Hi, I\'d like a free 3D design concept for my villa.\n\nName: ' + name + '\nPhone: ' + phone + '\nInterested in: ' + page;
      window.open(WA + encodeURIComponent(msg), '_blank');
      closePopup();
      trackEvent('exit_popup_submit', { name: name, page: page });
    });
  }

  // ═══ 4. GTM / GA4 TRACKING ═══
  // Replace GTM-XXXXXXX with your real GTM container ID
  function injectGTM() {
    // Skip if already present
    if (window.dataLayer) return;
    window.dataLayer = window.dataLayer || [];

    // GTM placeholder — uncomment and add your container ID:
    // (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
    // var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    // j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    // })(window,document,'script','dataLayer','GTM-XXXXXXX');
  }

  function trackEvent(name, params) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  // ═══ 5. WHATSAPP CLICK TRACKING ═══
  function trackWhatsAppClicks() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
      if (link) {
        trackEvent('whatsapp_click', {
          page: window.location.pathname,
          link_text: link.textContent.trim().substring(0, 50)
        });
      }
      var tel = e.target.closest('a[href^="tel:"]');
      if (tel) {
        trackEvent('phone_call_click', {
          page: window.location.pathname
        });
      }
    });
  }

  // ═══ 6. SCROLL DEPTH TRACKING ═══
  function trackScrollDepth() {
    var milestones = [25, 50, 75, 90];
    var fired = {};
    window.addEventListener('scroll', function() {
      var scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      milestones.forEach(function(m) {
        if (scrollPct >= m && !fired[m]) {
          fired[m] = true;
          trackEvent('scroll_depth', { depth: m, page: window.location.pathname });
        }
      });
    }, { passive: true });
  }

  // ═══ INIT ═══
  function init() {
    injectGTM();
    injectUrgencyBar();
    injectStickyCTA();
    injectExitPopup();
    trackWhatsAppClicks();
    trackScrollDepth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
