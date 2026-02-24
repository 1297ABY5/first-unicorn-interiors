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

    // Track
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'lead_magnet_download', guide: guideId, name: name });

    // Build WhatsApp message
    var msg = 'Hi, I just downloaded the ' + guideName + ' from your website.\n\n';
    msg += 'Name: ' + name + '\n';
    msg += 'Phone: ' + phone + '\n';
    if (email) msg += 'Email: ' + email + '\n';
    if (extra) msg += 'Interest: ' + extra + '\n';
    msg += '\nI\'d love to learn more about renovation options.';

    // Send to WhatsApp silently (open in background)
    var waUrl = 'https://wa.me/971585658002?text=' + encodeURIComponent(msg);

    // Show success + download
    card.style.display = 'none';
    success.classList.add('show');

    // Auto-open WhatsApp after short delay
    setTimeout(function() { window.open(waUrl, '_blank'); }, 1500);
  });
}
