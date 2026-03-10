/* Lead Magnet Gate — WhatsApp Capture */
function initGate(guideId, guideName) {
  var form = document.getElementById('gateForm');
  var card = document.getElementById('gateCard');
  var success = document.getElementById('gateSuccess');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var name = document.getElementById('gName').value.trim();
    var rawPhone = document.getElementById('gPhone').value.trim();
    var email = document.getElementById('gEmail') ? document.getElementById('gEmail').value.trim() : '';
    var extra = document.getElementById('gExtra') ? document.getElementById('gExtra').value : '';

    if (!name || !rawPhone) { alert('Please enter your name and WhatsApp number.'); return; }

    // Clean and validate UAE phone
    var digits = rawPhone.replace(/[\s\-()]/g, '');
    if (digits.startsWith('+971')) digits = digits.slice(4);
    else if (digits.startsWith('971')) digits = digits.slice(3);
    else if (digits.startsWith('00971')) digits = digits.slice(5);
    else if (digits.startsWith('0')) digits = digits.slice(1);

    if (!/^5\d{8}$/.test(digits)) {
      alert('Please enter a valid UAE mobile number (e.g. 55 123 4567)');
      return;
    }

    // Disable button
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

    // Track
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'lead_magnet_download', guide: guideId, name: name });

    // Fire Google Ads conversion
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: 'AW-612864132/wa_lead',
        value: 500.0,
        currency: 'AED'
      });
      gtag('event', 'generate_lead', {
        event_category: 'lead',
        event_label: 'guide_download_' + guideId,
        value: 500
      });
    }

    // Capture UTMs from session
    var utm = {};
    try {
      var sp = new URLSearchParams(location.search);
      utm.source = sp.get('utm_source') || '';
      utm.medium = sp.get('utm_medium') || '';
      utm.campaign = sp.get('utm_campaign') || '';
      utm.gclid = sp.get('gclid') || '';
      if (!utm.source && !utm.gclid) {
        var saved = sessionStorage.getItem('fui_utm');
        if (saved) utm = JSON.parse(saved);
      }
    } catch (ex) {}

    // Submit to API
    var payload = {
      name: name,
      phone: '+971' + digits,
      email: email || null,
      source: 'guide_download',
      page_url: location.pathname,
      document_requested: guideName,
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
      utm_gclid: utm.gclid || null
    };
    if (extra) payload.notes = 'Interest: ' + extra;

    fetch('/api/whatsapp-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
      showSuccess(res.whatsapp_url);
    })
    .catch(function() {
      // Fallback: still show success + wa.me link
      var msg = 'Hi, I just downloaded the ' + guideName + '.\nName: ' + name + '\nI\'d love to discuss my project.';
      showSuccess('https://wa.me/971585658002?text=' + encodeURIComponent(msg));
    });

    function showSuccess(waUrl) {
      card.style.display = 'none';
      success.classList.add('show');

      // Update WhatsApp link in success view
      var waLink = success.querySelector('.g-wa-link');
      if (waLink) waLink.href = waUrl;

      // Auto-open WhatsApp
      setTimeout(function() { window.open(waUrl, '_blank'); }, 1200);
    }
  });
}
