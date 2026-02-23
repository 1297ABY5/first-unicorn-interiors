/* ═══════════════════════════════════════
   CONVERSION ENGINE — First Unicorn Group
   Sticky CTA, Exit-Intent Popup, Tracking
═══════════════════════════════════════ */
(function(){
  'use strict';
  var WA = 'https://wa.me/971526455121?text=';
  var PHONE = 'tel:+971526455121';
  var WA_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>';

  // 2. STICKY SCROLL CTA BAR
  function injectStickyCTA() {
    if (document.querySelector('.sticky-cta')) return;
    var bar = document.createElement('div');
    bar.className = 'sticky-cta';
    bar.innerHTML = '<div class="sticky-cta-inner"><span class="sticky-cta-text">Ready to transform your villa? <strong>Free consultation \u2014 no obligation</strong></span><a href="' + WA + encodeURIComponent("Hi, I'd like to discuss a renovation project") + '" class="btn-whatsapp" target="_blank" rel="noopener">' + WA_SVG + ' WhatsApp Us</a><a href="' + PHONE + '" class="btn-secondary">Call Now</a></div>';
    document.body.appendChild(bar);
    var heroH = 600;
    var hero = document.querySelector('.hero, .page-hero');
    if (hero) heroH = hero.offsetHeight;
    window.addEventListener('scroll', function() {
      bar.classList.toggle('visible', window.pageYOffset > heroH);
    }, { passive: true });
  }

  // 3. EXIT-INTENT POPUP
  function injectExitPopup() {
    if (sessionStorage.getItem('ep_shown')) return;
    if (window.location.pathname.indexOf('/get-quote/') === 0) return;
    var overlay = document.createElement('div');
    overlay.className = 'exit-popup-overlay';
    overlay.innerHTML = '<div class="exit-popup"><button class="exit-popup-close" aria-label="Close">&times;</button><h2>Wait \u2014 Don\'t Leave Without This</h2><p>Get a <strong>free 3D design concept</strong> for your villa. See your renovation before it starts. No obligation.</p><a href="' + WA + encodeURIComponent("Hi, I'd like a free 3D design concept for my villa") + '" class="btn-whatsapp" target="_blank" rel="noopener" style="display:inline-flex;margin-bottom:1rem;">' + WA_SVG + ' Get My Free Design</a><br><a href="' + PHONE + '" class="btn-secondary" style="display:inline-flex;font-size:0.85rem;">Or Call +971 52 645 5121</a><p style="font-size:0.8rem;color:#888;margin-top:1.2rem;margin-bottom:0;">47 homeowners requested this month \u2022 Takes 30 seconds</p></div>';
    document.body.appendChild(overlay);
    function show() { if (sessionStorage.getItem('ep_shown')) return; overlay.classList.add('active'); sessionStorage.setItem('ep_shown','1'); track('exit_popup_shown'); }
    function hide() { overlay.classList.remove('active'); }
    document.addEventListener('mouseout', function(e) { if (e.clientY < 5 && !e.relatedTarget && !e.toElement) show(); });
    setTimeout(show, 45000);
    overlay.querySelector('.exit-popup-close').addEventListener('click', hide);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hide(); });
  }

  // 4. TRACKING
  function track(name, p) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: name }, p || {})); }
  function trackClicks() {
    document.addEventListener('click', function(e) {
      var wa = e.target.closest('a[href*="wa.me"]');
      if (wa) track('whatsapp_click', { page: location.pathname, text: wa.textContent.trim().substring(0,40) });
      var tel = e.target.closest('a[href^="tel:"]');
      if (tel) track('phone_click', { page: location.pathname });
    });
  }

  // 5. EMAIL CAPTURE — inject above footer on all pages
  function injectEmailCapture() {
    var footer = document.querySelector('.footer');
    if (!footer) return;
    if (document.querySelector('.email-capture')) return; // already present (e.g. homepage)
    if (window.location.pathname.indexOf('/get-quote/') === 0) return;
    if (window.location.pathname.indexOf('/free-design/') === 0) return;
    if (window.location.pathname.indexOf('/calculator/') === 0) return;
    var sec = document.createElement('section');
    sec.className = 'email-capture';
    sec.innerHTML = '<div class="container" style="max-width:680px;text-align:center;">' +
      '<div class="label">Free Download</div>' +
      '<h2>Get the 2026 Dubai Villa Renovation Cost Guide</h2>' +
      '<p style="color:var(--text-secondary);margin-bottom:2rem;">Real pricing from 800+ projects. Material comparisons, community breakdowns, and red flags to watch for.</p>' +
      '<div class="ec-form">' +
      '<input type="email" class="ec-input" placeholder="Your email address">' +
      '<button class="ec-btn">Send Me the Guide</button>' +
      '</div>' +
      '<div class="ec-privacy">No spam, ever. Unsubscribe anytime.</div>' +
      '</div>';
    footer.parentNode.insertBefore(sec, footer);
  }

  // 6. LEAD MAGNET BANNER — inject on service + community pages
  function injectLeadMagnetBanner() {
    var path = window.location.pathname;
    var isService = path.indexOf('/renovation/') === 0 || path.indexOf('/interiors/') === 0 || path.indexOf('/contracting/') === 0;
    var isCommunity = path.indexOf('/areas/') === 0 || path.indexOf('/communities/') === 0;
    if (!isService && !isCommunity) return;
    var main = document.querySelector('main');
    if (!main) return;
    var lastSection = main.querySelector('section:last-of-type');
    if (!lastSection) return;
    var banner = document.createElement('div');
    banner.className = 'lm-banner';
    banner.style.margin = '0 auto 3rem';
    banner.style.maxWidth = '960px';
    if (isCommunity) {
      banner.innerHTML = '<div><h3>Free 3D Design Concept</h3><p>See your renovation before it starts. Send us a few photos and our design team will create a custom concept &mdash; free, no obligation.</p></div>' +
        '<a href="/free-design/" class="btn-primary">Get My Free Design</a>';
    } else {
      banner.innerHTML = '<div><h3>Download the 2026 Cost Guide</h3><p>Real pricing from 800+ projects. Community breakdowns, material comparisons, and red flags to watch for.</p></div>' +
        '<a href="/blog/kitchen-renovation-cost-dubai/" class="btn-primary">Read the Guide</a>';
    }
    lastSection.parentNode.insertBefore(banner, lastSection.nextSibling);
  }

  // 7. ANIMATED COUNTER
  function animateCounters() {
    var counters = document.querySelectorAll('.stat-number');
    if (!counters.length) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.dataset.animated) return;
        el.dataset.animated = '1';
        var text = el.textContent.trim();
        var suffix = text.replace(/[\d.]/g, '');
        var target = parseFloat(text);
        if (isNaN(target)) return;
        var duration = 1500, start = performance.now();
        function step(now) {
          var progress = Math.min((now - start) / duration, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          var current = Math.floor(target * ease);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = text;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.3 });
    counters.forEach(function(c) { observer.observe(c); });
  }

  // INIT
  function init() {
    injectStickyCTA();
    injectExitPopup();
    injectEmailCapture();
    injectLeadMagnetBanner();
    trackClicks();
    animateCounters();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
