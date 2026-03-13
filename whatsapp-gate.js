/* ═══════════════════════════════════════
   WHATSAPP GATE v1 — First Unicorn Interiors
   Captures WhatsApp number before downloads
   + Inline quote forms on service pages
═══════════════════════════════════════ */
(function() {
  'use strict';

  var WA_NUMBER = '971585658002';
  var API_URL = '/api/whatsapp-lead';
  var WA_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>';

  // ── UTM CAPTURE ──
  var utm = {};
  try {
    var sp = new URLSearchParams(location.search);
    utm.source = sp.get('utm_source') || '';
    utm.medium = sp.get('utm_medium') || '';
    utm.campaign = sp.get('utm_campaign') || '';
    utm.gclid = sp.get('gclid') || '';
    // Persist UTMs across pages in session
    if (utm.source || utm.gclid) sessionStorage.setItem('fui_utm', JSON.stringify(utm));
    else {
      var saved = sessionStorage.getItem('fui_utm');
      if (saved) utm = JSON.parse(saved);
    }
  } catch (e) {}

  // ── PHONE VALIDATION ──
  function cleanPhone(raw) {
    var p = raw.replace(/[\s\-()]/g, '');
    if (p.startsWith('+971')) p = p.slice(4);
    else if (p.startsWith('971')) p = p.slice(3);
    else if (p.startsWith('00971')) p = p.slice(5);
    else if (p.startsWith('0')) p = p.slice(1);
    return p;
  }

  function isValidUAE(digits) {
    return /^5\d{8}$/.test(digits);
  }

  // ── FIRE GOOGLE ADS CONVERSION ──
  function fireConversion() {
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: 'AW-612864132/wa_lead',
        value: 500.0,
        currency: 'AED'
      });
      gtag('event', 'generate_lead', {
        event_category: 'lead',
        event_label: 'whatsapp_capture',
        value: 500
      });
    }
  }

  // ── SUBMIT LEAD ──
  function submitLead(data, callback) {
    var payload = Object.assign({
      page_url: location.pathname,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_gclid: utm.gclid
    }, data);

    // Fire conversion immediately
    fireConversion();

    // Try API first
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      callback(null, res);
    })
    .catch(function() {
      // API failed — build fallback wa.me link
      var text = data.document_requested
        ? 'Hi, I\'d like the ' + data.document_requested + '.\nName: ' + (data.name || '') + '\nPhone: +971' + cleanPhone(data.phone)
        : 'Hi, I\'d like a free quote.\nName: ' + (data.name || '') + '\nService: ' + (data.service || 'renovation');
      callback(null, { success: true, whatsapp_url: 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text) });
    });
  }

  // ── POPUP OVERLAY ──
  var popupCSS = '\
.wag-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);opacity:0;transition:opacity .3s;pointer-events:none}\
.wag-overlay.active{opacity:1;pointer-events:auto}\
.wag-popup{background:#111;border:1px solid rgba(183,149,87,.25);border-radius:16px;padding:2rem 1.8rem;max-width:420px;width:92%;position:relative;transform:translateY(20px);transition:transform .3s}\
.wag-overlay.active .wag-popup{transform:translateY(0)}\
.wag-close{position:absolute;top:10px;right:14px;background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;line-height:1}\
.wag-close:hover{color:#fff}\
.wag-title{font-family:"Playfair Display",Georgia,serif;font-size:1.3rem;color:#fff;margin-bottom:.4rem;text-align:center}\
.wag-sub{color:#999;font-size:.88rem;text-align:center;margin-bottom:1.5rem;line-height:1.5}\
.wag-field{margin-bottom:1rem}\
.wag-field label{display:block;font-size:.72rem;font-weight:600;color:#c4b9a8;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}\
.wag-field input{width:100%;padding:12px 14px;background:#0a0a0a;border:1px solid rgba(183,149,87,.15);border-radius:8px;color:#fff;font-size:.9rem;font-family:"DM Sans",sans-serif;outline:none;transition:border-color .3s}\
.wag-field input:focus{border-color:#b79557}\
.wag-field input::placeholder{color:rgba(160,152,136,.4)}\
.wag-phone-row{display:flex;gap:0}\
.wag-prefix{padding:12px 10px;background:#0a0a0a;border:1px solid rgba(183,149,87,.15);border-right:none;border-radius:8px 0 0 8px;color:#b79557;font-size:.9rem;font-weight:600;white-space:nowrap;display:flex;align-items:center}\
.wag-phone-row input{border-radius:0 8px 8px 0}\
.wag-btn{width:100%;padding:14px;background:#128C3E;color:#fff;font-weight:700;font-size:.95rem;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .3s;margin-top:.5rem}\
.wag-btn:hover{background:#15a349;transform:translateY(-1px)}\
.wag-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}\
.wag-privacy{font-size:.7rem;color:#666;text-align:center;margin-top:.8rem;line-height:1.5}\
.wag-err{color:#ef4444;font-size:.78rem;margin-top:4px;display:none}\
.wag-success{text-align:center;padding:1rem 0}\
.wag-success-icon{font-size:2.5rem;margin-bottom:.8rem}\
.wag-success h3{font-family:"Playfair Display",Georgia,serif;font-size:1.3rem;color:#fff;margin-bottom:.5rem}\
.wag-success p{color:#999;font-size:.88rem;margin-bottom:1.2rem}\
.wag-success-wa{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:#25d366;color:#fff;font-weight:600;font-size:.9rem;border-radius:8px;text-decoration:none;transition:all .3s}\
.wag-success-wa:hover{background:#20bd5a;transform:translateY(-1px);color:#fff}\
';

  // Inject CSS once
  var style = document.createElement('style');
  style.textContent = popupCSS;
  document.head.appendChild(style);

  // ── CREATE POPUP ──
  function showGatePopup(opts) {
    // opts: { title, subtitle, documentName, source, onSuccess }
    var overlay = document.createElement('div');
    overlay.className = 'wag-overlay';
    overlay.innerHTML = '\
<div class="wag-popup">\
  <button class="wag-close" aria-label="Close">&times;</button>\
  <div class="wag-form-view">\
    <div class="wag-title">' + (opts.title || 'Get It on WhatsApp') + '</div>\
    <div class="wag-sub">' + (opts.subtitle || 'Enter your WhatsApp number. We\'ll send it directly to your chat.') + '</div>\
    <form class="wag-form">\
      <div class="wag-field">\
        <label>Your Name</label>\
        <input type="text" name="name" placeholder="e.g. Sarah" required autocomplete="name">\
      </div>\
      <div class="wag-field">\
        <label>WhatsApp Number</label>\
        <div class="wag-phone-row">\
          <span class="wag-prefix">+971</span>\
          <input type="tel" name="phone" placeholder="5X XXX XXXX" required autocomplete="tel" inputmode="numeric" maxlength="11">\
        </div>\
        <div class="wag-err" id="wagPhoneErr">Enter a valid UAE mobile (e.g. 55 123 4567)</div>\
      </div>\
      <button type="submit" class="wag-btn">' + WA_SVG + ' Send to My WhatsApp</button>\
      <div class="wag-privacy">We\'ll send the guide to your WhatsApp. No spam, ever.</div>\
    </form>\
  </div>\
  <div class="wag-success" style="display:none">\
    <div class="wag-success-icon">\u2705</div>\
    <h3>Sent! Check Your WhatsApp</h3>\
    <p>We\'ve opened a chat so you can get your guide instantly.</p>\
    <a href="#" class="wag-success-wa" target="_blank">' + WA_SVG + ' Open WhatsApp</a>\
  </div>\
</div>';
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() { overlay.classList.add('active'); });

    var form = overlay.querySelector('.wag-form');
    var formView = overlay.querySelector('.wag-form-view');
    var successView = overlay.querySelector('.wag-success');
    var phoneErr = overlay.querySelector('#wagPhoneErr');
    var closeBtn = overlay.querySelector('.wag-close');

    function close() {
      overlay.classList.remove('active');
      setTimeout(function() { overlay.remove(); }, 300);
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = form.querySelector('[name="name"]').value.trim();
      var rawPhone = form.querySelector('[name="phone"]').value.trim();
      var digits = cleanPhone(rawPhone);

      if (!isValidUAE(digits)) {
        phoneErr.style.display = 'block';
        form.querySelector('[name="phone"]').focus();
        return;
      }
      phoneErr.style.display = 'none';

      var btn = form.querySelector('.wag-btn');
      btn.disabled = true;
      btn.innerHTML = 'Sending...';

      submitLead({
        name: name,
        phone: '+971' + digits,
        source: opts.source || 'whatsapp_gate',
        document_requested: opts.documentName || null
      }, function(err, res) {
        formView.style.display = 'none';
        successView.style.display = 'block';
        var waLink = successView.querySelector('.wag-success-wa');
        waLink.href = res.whatsapp_url || ('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hi, I\'d like the ' + (opts.documentName || 'guide')));

        // Track
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'whatsapp_lead_captured', source: opts.source, document: opts.documentName });

        // Auto-open WhatsApp
        setTimeout(function() { window.open(waLink.href, '_blank'); }, 800);

        if (opts.onSuccess) opts.onSuccess();
      });
    });

    // Focus name field
    setTimeout(function() { form.querySelector('[name="name"]').focus(); }, 300);
  }

  // ── INTERCEPT DOWNLOAD LINKS ──
  // Any link with data-wa-gate attribute triggers the popup
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-wa-gate]');
    if (!el) return;
    e.preventDefault();
    var docName = el.getAttribute('data-wa-gate') || el.textContent.trim();
    var source = el.getAttribute('data-wa-source') || 'download_gate';
    var targetUrl = el.getAttribute('data-wa-target') || el.getAttribute('href');
    showGatePopup({
      title: 'Get ' + docName + ' on WhatsApp',
      subtitle: 'Enter your WhatsApp number and we\'ll send it directly to your chat.',
      documentName: docName,
      source: source,
      onSuccess: function() {
        if (targetUrl && targetUrl !== '#') {
          setTimeout(function() { window.location.href = targetUrl; }, 2000);
        }
      }
    });
  });

  // ── INLINE WHATSAPP QUOTE FORM ──
  // Inject into elements with class "wa-quote-inject"
  var injectCSS = '\
.waq-section{background:linear-gradient(135deg,#0d0d0d,#161616);border:1px solid rgba(183,149,87,.15);border-radius:16px;padding:2rem 1.8rem;margin:2rem 0;max-width:560px}\
.waq-section h3{font-family:"Playfair Display",Georgia,serif;font-size:1.3rem;color:#fff;margin-bottom:.3rem}\
.waq-section .waq-sub{color:#999;font-size:.88rem;margin-bottom:1.2rem}\
.waq-section .wag-field{margin-bottom:.8rem}\
.waq-section select{width:100%;padding:12px 14px;background:#0a0a0a;border:1px solid rgba(183,149,87,.15);border-radius:8px;color:#fff;font-size:.9rem;font-family:"DM Sans",sans-serif;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23b79557\' stroke-width=\'2\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:18px;cursor:pointer}\
.waq-section select option{background:#0a0a0a;color:#fff}\
.waq-section textarea{width:100%;padding:12px 14px;background:#0a0a0a;border:1px solid rgba(183,149,87,.15);border-radius:8px;color:#fff;font-size:.9rem;font-family:"DM Sans",sans-serif;outline:none;resize:vertical;min-height:60px;transition:border-color .3s}\
.waq-section textarea:focus{border-color:#b79557}\
.waq-section textarea::placeholder{color:rgba(160,152,136,.4)}\
.waq-section .wag-btn{margin-top:.3rem}\
.waq-done{text-align:center;padding:1rem 0}\
.waq-done h4{color:#fff;font-family:"Playfair Display",Georgia,serif;margin-bottom:.4rem}\
.waq-done p{color:#999;font-size:.88rem}\
';

  var inlineStyle = document.createElement('style');
  inlineStyle.textContent = injectCSS;
  document.head.appendChild(inlineStyle);

  function injectQuoteForm(container) {
    var defaultService = container.getAttribute('data-service') || '';
    container.innerHTML = '\
<h3>Get a Free Quote on WhatsApp</h3>\
<p class="waq-sub">Tell us what you need. We reply within 5 minutes.</p>\
<form class="waq-form">\
  <div class="wag-field"><label>Your Name</label><input type="text" name="name" placeholder="e.g. Ahmed" required autocomplete="name"></div>\
  <div class="wag-field"><label>WhatsApp Number</label><div class="wag-phone-row"><span class="wag-prefix">+971</span><input type="tel" name="phone" placeholder="5X XXX XXXX" required autocomplete="tel" inputmode="numeric" maxlength="11"></div><div class="wag-err">Enter a valid UAE mobile number</div></div>\
  <div class="wag-field"><label for="wag-service">What do you need?</label><select name="service" id="wag-service"><option value="">Select one</option><option value="Villa Renovation"' + (defaultService === 'villa' ? ' selected' : '') + '>Villa Renovation</option><option value="Kitchen Renovation"' + (defaultService === 'kitchen' ? ' selected' : '') + '>Kitchen Renovation</option><option value="Bathroom Renovation"' + (defaultService === 'bathroom' ? ' selected' : '') + '>Bathroom Renovation</option><option value="Swimming Pool"' + (defaultService === 'pool' ? ' selected' : '') + '>Swimming Pool</option><option value="Glass & Aluminium"' + (defaultService === 'glass' ? ' selected' : '') + '>Glass & Aluminium</option><option value="Full Villa Construction"' + (defaultService === 'construction' ? ' selected' : '') + '>Full Villa Construction</option><option value="Design & Approvals"' + (defaultService === 'design' ? ' selected' : '') + '>Design & Approvals</option><option value="Other">Other</option></select></div>\
  <div class="wag-field"><label>Brief description (optional)</label><textarea name="message" placeholder="e.g. 4-bedroom villa in Arabian Ranches, need full kitchen and 3 bathrooms..." rows="2"></textarea></div>\
  <button type="submit" class="wag-btn">' + WA_SVG + ' Send on WhatsApp</button>\
</form>\
<div class="waq-done" style="display:none"><div style="font-size:2rem;margin-bottom:.5rem">\u2705</div><h4>Message Sent!</h4><p>We\'ve opened WhatsApp so you can continue the conversation.</p></div>';

    var form = container.querySelector('.waq-form');
    var done = container.querySelector('.waq-done');
    var phoneErr = container.querySelector('.wag-err');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var name = form.querySelector('[name="name"]').value.trim();
      var rawPhone = form.querySelector('[name="phone"]').value.trim();
      var digits = cleanPhone(rawPhone);
      var service = form.querySelector('[name="service"]').value;
      var message = form.querySelector('[name="message"]').value.trim();

      if (!isValidUAE(digits)) {
        phoneErr.style.display = 'block';
        form.querySelector('[name="phone"]').focus();
        return;
      }
      phoneErr.style.display = 'none';

      var btn = form.querySelector('.wag-btn');
      btn.disabled = true;
      btn.innerHTML = 'Sending...';

      submitLead({
        name: name,
        phone: '+971' + digits,
        source: 'inline_quote',
        service: service,
        message: message
      }, function(err, res) {
        form.style.display = 'none';
        done.style.display = 'block';

        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'whatsapp_quote_submitted', service: service });

        setTimeout(function() {
          window.open(res.whatsapp_url || ('https://wa.me/' + WA_NUMBER), '_blank');
        }, 500);
      });
    });
  }

  // Init inline forms
  function initInlineForms() {
    var containers = document.querySelectorAll('.wa-quote-inject');
    containers.forEach(function(el) { injectQuoteForm(el); });
  }

  // ── EXPOSE GLOBALS ──
  window.FUIGate = {
    show: showGatePopup,
    submitLead: submitLead,
    injectQuoteForm: injectQuoteForm
  };

  // Init on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initInlineForms);
  else initInlineForms();

})();
