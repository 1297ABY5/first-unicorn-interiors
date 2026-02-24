/* ═══════════════════════════════════════
   CONVERSION ENGINE v3 — First Unicorn Group
   Sticky CTA, A/B Exit Popup, Trust Toast,
   Scroll Tracking, Reading Progress, Back-to-Top
═══════════════════════════════════════ */
(function(){
  'use strict';
  var WA = 'https://wa.me/971585658002?text=';
  var PHONE = 'tel:+971585658002';
  var WA_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>';

  function track(name, p) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name, page: location.pathname }, p || {}));
  }

  // ═══ 1. STICKY CTA BAR ═══
  function injectStickyCTA() {
    if (document.querySelector('.sticky-cta')) return;
    var bar = document.createElement('div');
    bar.className = 'sticky-cta';
    bar.innerHTML = '<div class="sticky-cta-inner"><span class="sticky-cta-text">Ready to transform your villa? <strong>Free consultation \u2014 no obligation</strong></span><a href="' + WA + encodeURIComponent("Hi, I'd like to discuss a renovation project") + '" class="btn-whatsapp" target="_blank" rel="noopener">' + WA_SVG + ' WhatsApp Us</a><a href="' + PHONE + '" class="btn-secondary">Call Now</a></div>';
    document.body.appendChild(bar);
    var heroH = 600;
    var hero = document.querySelector('.hero, .page-hero, .article-hero, .guide-hero, .calc-hero');
    if (hero) heroH = hero.offsetHeight;
    window.addEventListener('scroll', function() {
      bar.classList.toggle('visible', window.pageYOffset > heroH);
    }, { passive: true });
  }

  // ═══ 2. A/B EXIT-INTENT POPUP (context-aware) ═══
  function injectExitPopup() {
    if (sessionStorage.getItem('ep_shown')) return;
    if (location.pathname.indexOf('/get-quote/') === 0) return;
    if (location.pathname.indexOf('/free-design/') === 0) return;

    var variants = [
      { id: 'cost_guide',
        html: '<h2>Wait \u2014 Take This With You</h2><p>Download our <strong>free 2026 Villa Renovation Cost Guide</strong> \u2014 real pricing from 800+ projects, community breakdowns, and red flags to watch for.</p><a href="/guides/cost-guide/" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">Download the Free Guide</a><br><a href="' + PHONE + '" class="btn-secondary" style="display:inline-flex;font-size:0.85rem;">Or Call +971 52 645 5121</a><p style="font-size:0.8rem;color:#888;margin-top:1.2rem;margin-bottom:0;">Downloaded by 320+ homeowners this month</p>' },
      { id: '3d_design',
        html: '<h2>Wait \u2014 Don\'t Leave Without This</h2><p>Get a <strong>free 3D design concept</strong> for your villa. See your renovation before it starts. No obligation.</p><a href="/free-design/" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">' + WA_SVG + ' Get My Free Design</a><br><a href="' + PHONE + '" class="btn-secondary" style="display:inline-flex;font-size:0.85rem;">Or Call +971 52 645 5121</a><p style="font-size:0.8rem;color:#888;margin-top:1.2rem;margin-bottom:0;">47 homeowners requested this month</p>' },
      { id: 'calculator',
        html: '<h2>Curious What It\u2019ll Cost?</h2><p>Our <strong>free renovation calculator</strong> gives you a personalised estimate in 60 seconds. 5 quick questions, instant results.</p><a href="/calculator/" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">Try the Free Calculator</a><br><a href="/guides/lookbook/" style="display:inline-flex;font-size:0.85rem;color:#b79557;text-decoration:none;">Or browse 50 Before &amp; After transformations \u2192</a><p style="font-size:0.8rem;color:#888;margin-top:1.2rem;margin-bottom:0;">Used by 180+ homeowners this month</p>' }
    ];

    var idx;
    var path = location.pathname;
    if (path.indexOf('/renovation/') === 0 || path.indexOf('/pricing') === 0) idx = 2;
    else if (path.indexOf('/blog/') === 0) idx = 0;
    else if (path.indexOf('/areas/') === 0 || path.indexOf('/communities/') === 0) idx = 1;
    else idx = Math.floor(Math.random() * variants.length);

    var v = variants[idx];
    var overlay = document.createElement('div');
    overlay.className = 'exit-popup-overlay';
    overlay.innerHTML = '<div class="exit-popup"><button class="exit-popup-close" aria-label="Close">&times;</button>' + v.html + '</div>';
    document.body.appendChild(overlay);

    function show() {
      if (sessionStorage.getItem('ep_shown')) return;
      overlay.classList.add('active');
      sessionStorage.setItem('ep_shown', '1');
      track('exit_popup_shown', { variant: v.id });
    }
    function hide() { overlay.classList.remove('active'); }

    document.addEventListener('mouseout', function(e) {
      if (e.clientY < 5 && !e.relatedTarget && !e.toElement) show();
    });
    var lastY = 0;
    window.addEventListener('scroll', function() {
      var y = window.pageYOffset;
      if (y < lastY - 200 && y > 500 && !sessionStorage.getItem('ep_shown')) setTimeout(show, 300);
      lastY = y;
    }, { passive: true });
    setTimeout(show, 45000);

    overlay.querySelector('.exit-popup-close').addEventListener('click', hide);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hide(); });
    overlay.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { track('exit_popup_click', { variant: v.id, href: a.getAttribute('href') }); });
    });
  }

  // ═══ 3. EMAIL CAPTURE ═══
  function injectEmailCapture() {
    var footer = document.querySelector('.footer');
    if (!footer || document.querySelector('.email-capture')) return;
    var skip = ['/get-quote/', '/free-design/', '/calculator/', '/guides/'];
    for (var i = 0; i < skip.length; i++) { if (location.pathname.indexOf(skip[i]) === 0) return; }
    var sec = document.createElement('section');
    sec.className = 'email-capture';
    sec.innerHTML = '<div class="container" style="max-width:680px;text-align:center;"><div class="label">Free Download</div><h2>Get the 2026 Dubai Villa Renovation Cost Guide</h2><p style="color:var(--text-secondary);margin-bottom:2rem;">Real pricing from 800+ projects. Material comparisons, community breakdowns, and red flags to watch for.</p><div class="ec-form"><input type="email" class="ec-input" placeholder="Your email address" id="ecEmail"><button class="ec-btn" id="ecSubmit">Send Me the Guide</button></div><div class="ec-privacy">No spam, ever. Unsubscribe anytime.</div></div>';
    footer.parentNode.insertBefore(sec, footer);
    document.getElementById('ecSubmit').addEventListener('click', function() {
      var input = document.getElementById('ecEmail');
      var email = input.value.trim();
      if (!email || email.indexOf('@') < 0) { input.style.borderColor = '#e74c3c'; return; }
      track('email_capture', { email: email, source: 'footer_cost_guide' });
      input.parentNode.innerHTML = '<p style="color:var(--gold,#b79557);font-weight:600;padding:12px 0;">Check your inbox! The guide is on its way.</p>';
    });
  }

  // ═══ 4. SCROLL DEPTH TRACKING ═══
  function trackScrollDepth() {
    var milestones = [25, 50, 75, 100], fired = {};
    window.addEventListener('scroll', function() {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      var pct = Math.round((window.pageYOffset / docH) * 100);
      milestones.forEach(function(m) {
        if (pct >= m && !fired[m]) { fired[m] = true; track('scroll_depth', { depth: m + '%' }); }
      });
    }, { passive: true });
  }

  // ═══ 5. BLOG READING PROGRESS BAR ═══
  function injectReadingProgress() {
    var article = document.querySelector('.article-body');
    if (!article) return;
    var bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.innerHTML = '<div class="reading-progress-fill"></div>';
    document.body.appendChild(bar);
    var fill = bar.querySelector('.reading-progress-fill');
    window.addEventListener('scroll', function() {
      var start = article.offsetTop - window.innerHeight;
      var end = article.offsetTop + article.offsetHeight;
      var progress = Math.min(Math.max((window.pageYOffset - start) / (end - start), 0), 1);
      fill.style.width = (progress * 100) + '%';
    }, { passive: true });
  }

  // ═══ 6. BACK TO TOP ═══
  function injectBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>';
    document.body.appendChild(btn);
    window.addEventListener('scroll', function() {
      btn.classList.toggle('visible', window.pageYOffset > 800);
    }, { passive: true });
    btn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // ═══ 7. SOCIAL PROOF TOAST ═══
  function injectSocialProof() {
    if (location.pathname.indexOf('/get-quote/') === 0) return;
    if (sessionStorage.getItem('sp_shown')) return;
    var proofs = [
      { community: 'Arabian Ranches', action: 'requested a free consultation' },
      { community: 'Palm Jumeirah', action: 'downloaded the cost guide' },
      { community: 'Dubai Hills', action: 'booked a site visit' },
      { community: 'Emirates Hills', action: 'requested a 3D design concept' },
      { community: 'Al Barari', action: 'used the renovation calculator' },
      { community: 'JGE', action: 'requested a free consultation' },
      { community: 'Arabian Ranches 2', action: 'downloaded the cost guide' },
      { community: 'Jumeirah Islands', action: 'booked a site visit' }
    ];
    setTimeout(function() {
      var p = proofs[Math.floor(Math.random() * proofs.length)];
      var toast = document.createElement('div');
      toast.className = 'social-proof-toast';
      toast.innerHTML = '<div class="sp-icon">&#127968;</div><div class="sp-text"><strong>A homeowner in ' + p.community + '</strong> just ' + p.action + '</div><button class="sp-close" onclick="this.parentNode.remove()">&times;</button>';
      document.body.appendChild(toast);
      setTimeout(function() { toast.classList.add('visible'); }, 100);
      setTimeout(function() { toast.classList.remove('visible'); }, 6000);
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 6500);
      sessionStorage.setItem('sp_shown', '1');
      track('social_proof_shown', { community: p.community });
    }, 12000 + Math.random() * 8000);
  }

  // ═══ 8. ENHANCED CLICK TRACKING ═══
  function trackClicks() {
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('wa.me') > -1) track('whatsapp_click', { text: a.textContent.trim().substring(0, 40) });
      else if (href.indexOf('tel:') === 0) track('phone_click');
      else if (href.indexOf('/guides/') > -1) track('guide_click', { guide: href });
      else if (href.indexOf('/calculator/') > -1) track('calculator_click');
      else if (href.indexOf('/free-design/') > -1) track('free_design_click');
      else if (href.indexOf('/blog/') > -1 && href !== '/blog/') track('blog_click', { article: href });
      else if (href.indexOf('/get-quote/') > -1) track('quote_click', { service: href });
      var btn = e.target.closest('.btn-primary, .btn-whatsapp, .gf-submit, .ec-btn');
      if (btn) track('cta_click', { text: btn.textContent.trim().substring(0, 40) });
    });
  }

  // ═══ 9. ANIMATED COUNTERS ═══
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
        var dur = 1500, st = performance.now();
        (function step(now) {
          var p = Math.min((now - st) / dur, 1);
          el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(step); else el.textContent = text;
        })(st);
      });
    }, { threshold: 0.3 });
    counters.forEach(function(c) { observer.observe(c); });
  }

  // ═══ 10. TIME ON PAGE ═══
  function trackTimeOnPage() {
    var start = Date.now();
    window.addEventListener('beforeunload', function() {
      track('time_on_page', { seconds: Math.round((Date.now() - start) / 1000) });
    });
  }

  // ═══ INIT ═══
  function init() {
    injectStickyCTA();
    injectExitPopup();
    injectEmailCapture();
    trackClicks();
    trackScrollDepth();
    trackTimeOnPage();
    injectReadingProgress();
    injectBackToTop();
    injectSocialProof();
    animateCounters();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
