/* ═══════════════════════════════════════
   ANALYTICS — GA4 + Google Ads + Meta Pixel
   First Unicorn Interiors
═══════════════════════════════════════ */

// GA4 + Google Ads (shared gtag)
(function(){
  var ga4 = 'G-47FB832GF5';
  var gads = 'AW-612864132';
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ga4);
  gtag('config', gads);
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga4;
  document.head.appendChild(s);
})();

// Meta Pixel
(function(){
  var id = 'PIXEL_ID'; // ← Replace with your Meta Pixel ID when ready
  if (id === 'PIXEL_ID') return;
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', id); fbq('track', 'PageView');
})();

// ═══ CONVERSION TRACKING ═══
// Tracks WhatsApp clicks and phone calls as Google Ads conversions
(function(){
  function fireConversion(type, label, url) {
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        send_to: 'AW-612864132/' + label,
        event_callback: function() {
          if (url) window.open(url, '_blank');
        }
      });
      // Also push to dataLayer for GA4
      gtag('event', type, {
        event_category: 'lead',
        event_label: document.title,
        page_path: location.pathname
      });
    }
  }

  document.addEventListener('click', function(e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    // WhatsApp click = conversion
    if (href.indexOf('wa.me') > -1) {
      e.preventDefault();
      fireConversion('whatsapp_lead', '9wrRCKLwzIUcEIShnqQC', href);
      // Fallback: open after 1s if callback didn't fire
      setTimeout(function(){ window.open(href, '_blank'); }, 1000);
    }

    // Phone call click = conversion
    if (href.indexOf('tel:') === 0) {
      fireConversion('phone_lead', 'uJBqCKXwzIUcEIShnqQC', null);
      // Don't prevent default — let the call happen
    }
  });
})();
