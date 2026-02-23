/* ═══════════════════════════════════════
   ANALYTICS — GA4 + Meta Pixel
   Replace G-XXXXXXXXXX and PIXEL_ID with real IDs
═══════════════════════════════════════ */

// GA4
(function(){
  var id = 'G-XXXXXXXXXX'; // ← Replace with your GA4 Measurement ID
  if (id === 'G-XXXXXXXXXX') return; // Skip if not configured
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date()); gtag('config', id);
})();

// Meta Pixel
(function(){
  var id = 'PIXEL_ID'; // ← Replace with your Meta Pixel ID
  if (id === 'PIXEL_ID') return; // Skip if not configured
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', id); fbq('track', 'PageView');
})();
