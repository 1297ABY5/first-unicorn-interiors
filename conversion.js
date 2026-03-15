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
      var show = window.pageYOffset > heroH;
      bar.classList.toggle('visible', show);
      var waFloat = document.querySelector('.whatsapp-float');
      if (waFloat && window.innerWidth <= 768) {
        waFloat.style.opacity = show ? '0' : '1';
        waFloat.style.pointerEvents = show ? 'none' : 'auto';
        waFloat.style.transform = show ? 'translateY(80px)' : 'none';
        waFloat.style.transition = 'all 0.3s ease';
      }
    }, { passive: true });
  }

  // ═══ 2. EXIT-INTENT POPUP — DISABLED (hurts premium perception) ═══
  function injectExitPopup() {
    return; // Disabled — exit popups reduce trust for premium renovation clients
    if (sessionStorage.getItem('ep_shown')) return;
    if (location.pathname.indexOf('/get-quote/') === 0) return;
    if (location.pathname.indexOf('/free-design/') === 0) return;

    var variants = [
      { id: 'cost_guide',
        html: '<h2>Wait \u2014 Take This With You</h2><p>Get our <strong>free 2026 Villa Renovation Cost Guide</strong> sent straight to your WhatsApp \u2014 real pricing from 800+ projects, community breakdowns, and red flags to watch for.</p><a href="#" data-wa-gate="Villa Renovation Cost Guide" data-wa-source="exit_popup" data-wa-target="/guides/cost-guide/guide.html" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">' + WA_SVG + ' Get Guide on WhatsApp</a><br><a href="' + PHONE + '" class="btn-secondary" style="display:inline-flex;font-size:0.85rem;">Or Call +971 58 565 8002</a>' },
      { id: '3d_design',
        html: '<h2>Wait \u2014 Don\'t Leave Without This</h2><p>Get a <strong>free 3D design concept</strong> for your villa. See your renovation before it starts. No obligation.</p><a href="/free-design/" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">' + WA_SVG + ' Get My Free Design</a><br><a href="' + PHONE + '" class="btn-secondary" style="display:inline-flex;font-size:0.85rem;">Or Call +971 58 565 8002</a>' },
      { id: 'calculator',
        html: '<h2>Curious What It\u2019ll Cost?</h2><p>Our <strong>free renovation calculator</strong> gives you a personalised estimate in 60 seconds. 5 quick questions, instant results.</p><a href="/calculator/" class="btn-primary" style="display:inline-flex;margin-bottom:1rem;">Try the Free Calculator</a><br><a href="/guides/lookbook/" style="display:inline-flex;font-size:0.85rem;color:#7D8C6E;text-decoration:none;">Or browse 50 Before &amp; After transformations \u2192</a>' }
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

  // ═══ 3. WHATSAPP CAPTURE (replaced email capture) ═══
  function injectEmailCapture() {
    var footer = document.querySelector('.footer');
    if (!footer || document.querySelector('.email-capture')) return;
    var skip = ['/get-quote/', '/free-design/', '/calculator/', '/guides/'];
    for (var i = 0; i < skip.length; i++) { if (location.pathname.indexOf(skip[i]) === 0) return; }
    var sec = document.createElement('section');
    sec.className = 'email-capture';
    sec.innerHTML = '<div class="container" style="max-width:680px;text-align:center;"><div class="label">Free Resource</div><h2>The 2026 Dubai Villa Renovation Cost Guide</h2><p style="color:var(--text-secondary);margin-bottom:2rem;">Real pricing from 800+ projects. Material comparisons, community breakdowns, and red flags to watch for.</p><a href="#" data-wa-gate="Villa Renovation Cost Guide" data-wa-source="footer_cta" data-wa-target="/guides/cost-guide/guide.html" class="btn-primary" style="display:inline-flex;padding:14px 32px;font-size:.9rem;">' + WA_SVG + ' Get the Free Guide on WhatsApp</a></div>';
    footer.parentNode.insertBefore(sec, footer);
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

  // ═══ 7. SOCIAL PROOF TOAST — DISABLED (fake urgency hurts premium brand) ═══
  function injectSocialProof() {
    return; // Disabled — fabricated social proof reduces trust
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


  // ═══ 11. QUOTE FORM (service pages) ═══
  function injectQuoteForm() {
    var path = location.pathname;
    var servicePaths = ['/renovation/', '/interiors/', '/contracting/', '/design-approvals/'];
    var isServicePage = false;
    for (var i = 0; i < servicePaths.length; i++) {
      if (path.indexOf(servicePaths[i]) === 0) { isServicePage = true; break; }
    }
    if (!isServicePage) return;
    if (document.querySelector('.quote-form-section')) return;

    var pageTitle = document.querySelector('.page-hero-content h1, h1');
    var serviceName = pageTitle ? pageTitle.textContent.trim() : 'Renovation';

    var sec = document.createElement('section');
    sec.className = 'quote-form-section fade-in';
    sec.innerHTML = '<div class="quote-form-wrap">' +
      '<h2>Get Your Free Quote</h2>' +
      '<p class="qf-sub">Tell us about your project. We\'ll reply within 2 hours with a detailed estimate.</p>' +
      '<form id="quoteForm">' +
      '<div class="qf-row">' +
      '<div class="qf-field"><label>Your Name</label><input type="text" name="name" placeholder="Full name" required></div>' +
      '<div class="qf-field"><label>Phone Number</label><input type="tel" name="phone" placeholder="+971 5X XXX XXXX" required></div>' +
      '</div>' +
      '<div class="qf-field"><label>Service Needed</label>' +
      '<select name="service">' +
      '<option value="Villa Renovation">Full Villa Renovation</option>' +
      '<option value="Kitchen">Kitchen Renovation</option>' +
      '<option value="Bathroom">Bathroom Renovation</option>' +
      '<option value="Swimming Pool">Swimming Pool</option>' +
      '<option value="Interior Fit-Out">Interior Fit-Out</option>' +
      '<option value="Glass & Aluminium">Glass &amp; Aluminium</option>' +
      '<option value="Joinery">Joinery &amp; Cabinetry</option>' +
      '<option value="Flooring">Flooring</option>' +
      '<option value="Landscaping">Landscaping</option>' +
      '<option value="Design & Approvals">Design &amp; Approvals</option>' +
      '<option value="Construction">Villa Construction</option>' +
      '<option value="Other">Other</option>' +
      '</select></div>' +
      '<div class="qf-field"><label>Community / Area</label>' +
      '<select name="area">' +
      '<option value="">Select your area</option>' +
      '<option value="Palm Jumeirah">Palm Jumeirah</option>' +
      '<option value="Emirates Hills">Emirates Hills</option>' +
      '<option value="Arabian Ranches">Arabian Ranches</option>' +
      '<option value="Dubai Hills">Dubai Hills</option>' +
      '<option value="Al Barari">Al Barari</option>' +
      '<option value="Jumeirah Islands">Jumeirah Islands</option>' +
      '<option value="DAMAC Hills">DAMAC Hills</option>' +
      '<option value="Jumeirah Golf Estates">Jumeirah Golf Estates</option>' +
      '<option value="The Lakes">The Lakes / Springs</option>' +
      '<option value="Tilal Al Ghaf">Tilal Al Ghaf</option>' +
      '<option value="MBR City">MBR City</option>' +
      '<option value="Other">Other</option>' +
      '</select></div>' +
      '<div class="qf-field"><label>Tell us about your project <span style="font-weight:400;text-transform:none">(optional)</span></label>' +
      '<textarea name="details" placeholder="E.g. I want to renovate my 4-bedroom villa, focusing on kitchen and bathrooms..."></textarea></div>' +
      '<button type="submit" class="qf-submit">' + WA_SVG + ' Get My Free Quote</button>' +
      '</form>' +
      '<p class="qf-privacy">Your details go straight to our team via WhatsApp. No spam, ever.</p>' +
      '<div class="qf-trust">' +
      '<span><span class="qf-check">\u2713</span> Free consultation</span>' +
      '<span><span class="qf-check">\u2713</span> Reply within 2 hours</span>' +
      '<span><span class="qf-check">\u2713</span> No obligation</span>' +
      '</div>' +
      '</div>';

    var ctaBlock = document.querySelector('.cta-block');
    if (ctaBlock) {
      ctaBlock.parentNode.insertBefore(sec, ctaBlock);
    } else {
      var footer = document.querySelector('.footer');
      if (footer) footer.parentNode.insertBefore(sec, footer);
    }

    var select = sec.querySelector('select[name="service"]');
    if (path.indexOf('/kitchen') > -1) select.value = 'Kitchen';
    else if (path.indexOf('/bathroom') > -1) select.value = 'Bathroom';
    else if (path.indexOf('/pool') > -1) select.value = 'Swimming Pool';
    else if (path.indexOf('/full-villa') > -1) select.value = 'Villa Renovation';
    else if (path.indexOf('/glass') > -1) select.value = 'Glass & Aluminium';
    else if (path.indexOf('/joinery') > -1) select.value = 'Joinery';
    else if (path.indexOf('/flooring') > -1) select.value = 'Flooring';
    else if (path.indexOf('/landscaping') > -1) select.value = 'Landscaping';
    else if (path.indexOf('/villa-fit-out') > -1 || path.indexOf('/residential') > -1 || path.indexOf('/commercial') > -1) select.value = 'Interior Fit-Out';
    else if (path.indexOf('/design-approvals') > -1) select.value = 'Design & Approvals';
    else if (path.indexOf('/contracting') > -1) select.value = 'Construction';

    sec.querySelector('#quoteForm').addEventListener('submit', function(e) {
      e.preventDefault();
      var f = e.target;
      var name = f.name.value.trim();
      var phone = f.phone.value.trim();
      var service = f.service.value;
      var area = f.area.value;
      var details = f.details.value.trim();
      if (!name || !phone) return;
      var msg = 'Hi, I\'d like a free quote.\n\n';
      msg += 'Name: ' + name + '\n';
      msg += 'Phone: ' + phone + '\n';
      msg += 'Service: ' + service + '\n';
      if (area) msg += 'Area: ' + area + '\n';
      if (details) msg += 'Details: ' + details + '\n';
      msg += '\n[Source: ' + serviceName + ' page - Quote Form]';
      track('quote_form_submit', { service: service, area: area });
      window.open('https://wa.me/971585658002?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  // ═══ INIT ═══
  function init() {
    injectStickyCTA();
    injectExitPopup();
    injectEmailCapture();
    injectQuoteForm();
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
