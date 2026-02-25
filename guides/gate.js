/* Lead Magnet Gate — Shared Logic */
function initGate(guideId, guideName) {
  var form = document.getElementById('gateForm');
  var card = document.getElementById('gateCard');
  var success = document.getElementById('gateSuccess');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var name = document.getElementById('gName').value.trim();
    var phone = document.getElementById('gPhone').value.trim();
    var email = document.getElementById('gEmail') ? document.getElementById('gEmail').value.trim() : '';
    var extra = document.getElementById('gExtra') ? document.getElementById('gExtra').value : '';

    if (!name || !phone) { alert('Please enter your name and phone number.'); return; }

    // Disable button
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

    // Track
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'lead_magnet_download', guide: guideId, name: name });

    // ── 1. SEND EMAIL via Web3Forms ──
    var timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' });
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: 'YOUR_WEB3FORMS_ACCESS_KEY',
        subject: '📥 New ' + guideName + ' Download — ' + name + ' (' + (extra || 'Not specified') + ')',
        from_name: 'First Unicorn Website',
        name: name,
        phone: phone,
        email: email || 'Not provided',
        room_interest: extra || 'Not specified',
        source: guideName + ' Download',
        submitted_at: timestamp,
        message:
          '🔔 NEW LEAD — ' + guideName + ' Download\n\n' +
          '👤 Name: ' + name + '\n' +
          '📱 Phone/WhatsApp: ' + phone + '\n' +
          '📧 Email: ' + (email || 'Not provided') + '\n' +
          '🏠 Room Interest: ' + (extra || 'Not specified') + '\n' +
          '📄 Source: ' + guideName + '\n' +
          '🕐 Time (Dubai): ' + timestamp + '\n\n' +
          '──────────────────────────\n' +
          'ACTION: Follow up within 2 hours.\n' +
          'WhatsApp: https://wa.me/' + phone.replace(/[^0-9]/g, '') + '\n' +
          '──────────────────────────'
      })
    }).then(function() {
      console.log('✅ Email sent to info@unicornrenovations.com');
    }).catch(function(err) {
      console.error('❌ Email failed:', err);
    });

    // ── 2. Build WhatsApp message ──
    var msg = 'Hi, I just downloaded the ' + guideName + ' from your website.\n\n';
    msg += 'Name: ' + name + '\n';
    msg += 'Phone: ' + phone + '\n';
    if (email) msg += 'Email: ' + email + '\n';
    if (extra) msg += 'Interest: ' + extra + '\n';
    msg += '\nI\'d love to learn more about renovation options.';

    var waUrl = 'https://wa.me/971585658002?text=' + encodeURIComponent(msg);

    // ── 3. Show success + download ──
    card.style.display = 'none';
    success.classList.add('show');

    // Auto-open WhatsApp after short delay
    setTimeout(function() { window.open(waUrl, '_blank'); }, 1500);
  });
}
