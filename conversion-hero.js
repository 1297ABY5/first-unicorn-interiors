/* ═══════════════════════════════════════════════════════════
   CONVERSION HERO — Auto-injecting conversion band
   Adds a high-converting CTA strip between nav and hero
   on ALL service, area, and interior pages.
   
   ONE script tag. Zero per-page editing. 220 pages covered.
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const WA = '971526455121'; // FUI ads number

  // ── Page config map: path patterns → conversion data ──
  const CONFIG = {
    // SERVICE PAGES
    '/renovation/bathroom/': {
      badge: 'Bathroom Renovation',
      hook: 'Cracked tiles? Mouldy grout? We fix it in 3–4 weeks.',
      price: 'From AED 25,000',
      msg: 'Hi, I need a bathroom renovation quote. [Source: Bathroom Page]'
    },
    '/renovation/kitchen/': {
      badge: 'Kitchen Renovation',
      hook: 'Custom cabinetry, countertops & appliances — done in 4–6 weeks.',
      price: 'From AED 45,000',
      msg: 'Hi, I need a kitchen renovation quote. [Source: Kitchen Page]'
    },
    '/renovation/pool/': {
      badge: 'Swimming Pool',
      hook: 'New build or renovation. Tiling, plumbing, decking — one contractor.',
      price: 'From AED 100,000',
      msg: 'Hi, I\'m interested in a swimming pool project. [Source: Pool Page]'
    },
    '/renovation/full-villa/': {
      badge: 'Full Villa Renovation',
      hook: 'Complete villa transformation. One team, one timeline, one price.',
      price: 'From AED 150,000',
      msg: 'Hi, I need a full villa renovation quote. [Source: Villa Page]'
    },
    '/renovation/glass-aluminium/': {
      badge: 'Glass & Aluminium',
      hook: 'Frameless showers, partitions, balustrades — in-house fabrication.',
      price: 'From AED 5,000',
      msg: 'Hi, I need a glass/aluminium quote. [Source: Glass Page]'
    },
    '/renovation/landscaping/': {
      badge: 'Landscaping',
      hook: 'Pergolas, decking, outdoor kitchens, irrigation — full garden build.',
      price: 'From AED 30,000',
      msg: 'Hi, I\'m interested in landscaping for my villa. [Source: Landscaping Page]'
    },
    '/renovation/solar/': {
      badge: 'Solar Panels',
      hook: 'Cut DEWA bills 50–90%. Shams Dubai certified. ROI in 2–4 years.',
      price: 'From AED 25,000',
      msg: 'Hi, I\'m interested in solar panels for my villa. [Source: Solar Page]'
    },
    '/renovation/ev-charger/': {
      badge: 'EV Charger',
      hook: 'Home EV charging installed by licensed electricians. Same-week install.',
      price: 'From AED 4,500',
      msg: 'Hi, I need an EV charger installed at my villa. [Source: EV Page]'
    },
    '/renovation/flooring/': {
      badge: 'Flooring',
      hook: 'Marble, porcelain, wood, SPC — full villa flooring in 1–2 weeks.',
      price: 'From AED 15,000',
      msg: 'Hi, I need a flooring quote. [Source: Flooring Page]'
    },
    '/renovation/joinery/': {
      badge: 'Joinery & Cabinetry',
      hook: 'Wardrobes, vanities, TV units — built in our workshop, installed in yours.',
      price: 'From AED 8,000',
      msg: 'Hi, I need a joinery/cabinetry quote. [Source: Joinery Page]'
    },
    '/renovation/villa-extension/': {
      badge: 'Villa Extension',
      hook: 'Add rooms, majlis, maid\'s quarters — permits to handover.',
      price: 'From AED 200,000',
      msg: 'Hi, I\'m interested in a villa extension. [Source: Extension Page]'
    },
    // INTERIOR PAGES
    '/interiors/residential/': {
      badge: 'Residential Interiors',
      hook: 'Full interior design & fit-out. Furniture, lighting, finishes — turnkey.',
      price: 'Custom Quote',
      msg: 'Hi, I need residential interior design. [Source: Residential Page]'
    },
    '/interiors/commercial/': {
      badge: 'Commercial Interiors',
      hook: 'Office, retail, restaurant fit-out. Licensed contractor, one team.',
      price: 'Custom Quote',
      msg: 'Hi, I need a commercial fit-out quote. [Source: Commercial Page]'
    },
    '/interiors/villa-fit-out/': {
      badge: 'Villa Fit-Out',
      hook: 'Post-handover fit-out before you move in. Every room, every detail.',
      price: 'From AED 80,000',
      msg: 'Hi, I need a villa fit-out quote. [Source: Fit-Out Page]'
    },
    // AD LANDING PAGES (service-type, not LP)
    '/renovation/home/': {
      badge: 'Home Renovation',
      hook: 'Complete home transformation. Kitchen, bathroom, flooring — one price.',
      price: 'From AED 80,000',
      msg: 'Hi, I need a home renovation quote. [Source: Home Reno Page]'
    },
    '/renovation/interior-design/': {
      badge: 'Interior Design',
      hook: 'Design-led renovation. 3D concepts before any work begins.',
      price: 'Custom Quote',
      msg: 'Hi, I\'m interested in interior design services. [Source: Interior Design Page]'
    },
    '/renovation/apartment/': {
      badge: 'Apartment Renovation',
      hook: 'Studio to penthouse. Building approvals, fit-out, handover — handled.',
      price: 'From AED 40,000',
      msg: 'Hi, I need an apartment renovation quote. [Source: Apartment Page]'
    },
    '/renovation/townhouse/': {
      badge: 'Townhouse Renovation',
      hook: 'Full townhouse refresh. We know every Dubai townhouse layout.',
      price: 'From AED 80,000',
      msg: 'Hi, I need a townhouse renovation quote. [Source: Townhouse Page]'
    },
    '/renovation/penthouse/': {
      badge: 'Penthouse Renovation',
      hook: 'Luxury penthouse fit-out. Premium materials, premium finish.',
      price: 'From AED 150,000',
      msg: 'Hi, I need a penthouse renovation quote. [Source: Penthouse Page]'
    },
    '/renovation/duplex/': {
      badge: 'Duplex Renovation',
      hook: 'Two floors, one contractor. Stairs, kitchen, bathrooms — all trades in-house.',
      price: 'From AED 100,000',
      msg: 'Hi, I need a duplex renovation quote. [Source: Duplex Page]'
    },
    '/interior-renovation-company-dubai/': {
      badge: 'Interior Renovation',
      hook: 'Dubai\'s in-house renovation company. No subcontractors, no surprises.',
      price: 'Free Consultation',
      msg: 'Hi, I\'m looking for an interior renovation company. [Source: Interior Reno Company Page]'
    },
    // CONTRACTING
    '/contracting/villa-construction/': {
      badge: 'Villa Construction',
      hook: 'Ground-up villa construction. Licensed, insured, one team.',
      price: 'Custom Quote',
      msg: 'Hi, I need a villa construction quote. [Source: Construction Page]'
    },
    '/contracting/structural-works/': {
      badge: 'Structural Works',
      hook: 'Extensions, modifications, structural reinforcement — engineer-led.',
      price: 'Custom Quote',
      msg: 'Hi, I need structural work done. [Source: Structural Page]'
    },
    // DESIGN APPROVALS
    '/design-approvals/architectural-design/': {
      badge: 'Architectural Design',
      hook: 'DM-approved drawings. Municipality submissions handled.',
      price: 'From AED 15,000',
      msg: 'Hi, I need architectural design services. [Source: Architecture Page]'
    },
    '/design-approvals/3d-visualisation/': {
      badge: '3D Visualisation',
      hook: 'See your renovation before it starts. Photorealistic 3D renders.',
      price: 'From AED 5,000',
      msg: 'Hi, I\'m interested in 3D visualisation. [Source: 3D Vis Page]'
    }
  };

  // ── Community pages: auto-generate from URL ──
  function getCommunityConfig(path) {
    var m = path.match(/^\/areas\/([^/]+)\//);
    if (!m) return null;
    var slug = m[1];
    var name = slug.replace(/-/g, ' ').replace(/\bjvc\b/gi,'JVC').replace(/\bjvt\b/gi,'JVT').replace(/\bjbr\b/gi,'JBR').replace(/\bjlt\b/gi,'JLT').replace(/\bmbr\b/gi,'MBR').replace(/\bjge\b/gi,'JGE').replace(/\bdifc\b/gi,'DIFC').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    return {
      badge: name + ' Renovation',
      hook: 'Villa renovation specialists in ' + name + '. We know every layout.',
      price: 'Free Site Visit',
      msg: 'Hi, I have a villa in ' + name + ' and need a renovation quote. [Source: ' + name + ' Page]'
    };
  }

  // ── Apartment pages: auto-generate ──
  function getApartmentConfig(path) {
    var m = path.match(/^\/apartments\/([^/]+)\//);
    if (!m) return null;
    var slug = m[1];
    var name = slug.replace(/-/g, ' ').replace(/\bjbr\b/gi,'JBR').replace(/\bjlt\b/gi,'JLT').replace(/\bdifc\b/gi,'DIFC').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    return {
      badge: name + ' Renovation',
      hook: 'Apartment renovation in ' + name + '. Building approvals handled.',
      price: 'Free Consultation',
      msg: 'Hi, I have an apartment in ' + name + ' and need renovation. [Source: ' + name + ' Apt Page]'
    };
  }

  // ── Resolve current page config ──
  var path = window.location.pathname;
  var cfg = CONFIG[path] || getCommunityConfig(path) || getApartmentConfig(path);
  
  // Don't inject on: homepage, LP pages, admin pages, guides, blog, portfolio, or pages with no config
  if (!cfg) return;
  if (path === '/' || path.indexOf('/lp/') === 0 || path.indexOf('/cmd-') === 0 || path.indexOf('/atlas-') === 0) return;
  if (path.indexOf('/blog/') === 0 || path.indexOf('/guides/') === 0 || path.indexOf('/get-quote/') === 0) return;
  if (path.indexOf('/portfolio/') === 0 || path === '/about/' || path === '/contact/' || path === '/faq/' || path === '/privacy/' || path === '/terms/') return;

  var waURL = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(cfg.msg);

  // ── Inject CSS ──
  var style = document.createElement('style');
  style.textContent = [
    '.cv-hero{background:linear-gradient(135deg,#1a1408 0%,#2a1f10 50%,#1a1408 100%);border-bottom:1px solid rgba(160,120,90,0.3);padding:18px 20px;position:relative;overflow:hidden;z-index:10}',
    '.cv-hero::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#A0785A,transparent)}',
    '.cv-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}',
    '.cv-left{flex:1;min-width:280px}',
    '.cv-badge{display:inline-block;background:rgba(160,120,90,0.2);border:1px solid rgba(160,120,90,0.35);color:#cba76a;font-size:0.62rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 12px;border-radius:50px;margin-bottom:8px}',
    '.cv-hook{color:#f0ece4;font-size:1rem;font-weight:600;line-height:1.4;margin:0 0 4px 0;font-family:Inter,-apple-system,sans-serif}',
    '.cv-trust{display:flex;gap:14px;flex-wrap:wrap;margin-top:6px}',
    '.cv-trust span{color:#999;font-size:0.68rem;display:flex;align-items:center;gap:4px;letter-spacing:0.3px}',
    '.cv-trust svg{width:12px;height:12px;fill:#A0785A;flex-shrink:0}',
    '.cv-right{display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '.cv-price{color:#cba76a;font-size:1.1rem;font-weight:700;font-family:Inter,-apple-system,sans-serif;white-space:nowrap}',
    '.cv-wa{display:inline-flex;align-items:center;gap:8px;background:#0e6b30;color:#fff;font-size:0.85rem;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;transition:all 0.2s;white-space:nowrap;box-shadow:0 4px 15px rgba(14,107,48,0.3)}',
    '.cv-wa:hover{background:#0c5a28;transform:translateY(-1px);box-shadow:0 6px 20px rgba(14,107,48,0.4)}',
    '.cv-wa svg{width:18px;height:18px;fill:#fff;flex-shrink:0}',
    '.cv-call{display:inline-flex;align-items:center;gap:6px;color:#cba76a;font-size:0.78rem;font-weight:500;text-decoration:none;padding:10px 16px;border:1px solid rgba(160,120,90,0.35);border-radius:8px;transition:all 0.2s;white-space:nowrap}',
    '.cv-call:hover{background:rgba(160,120,90,0.1);border-color:#A0785A}',
    '.cv-call svg{width:14px;height:14px;fill:none;stroke:#A0785A;stroke-width:2}',
    '@media(max-width:768px){',
    '  .cv-inner{flex-direction:column;text-align:center;gap:12px}',
    '  .cv-trust{justify-content:center}',
    '  .cv-right{flex-direction:column;width:100%;gap:8px}',
    '  .cv-wa{width:100%;justify-content:center;padding:14px 20px;font-size:0.95rem}',
    '  .cv-call{width:100%;justify-content:center}',
    '  .cv-hook{font-size:0.92rem}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Build HTML ──
  var checkSVG = '<svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>';
  var waSVG = '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.855L.054 23.52l5.805-1.522A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.87 0-3.63-.5-5.14-1.38l-.37-.22-3.44.9.92-3.37-.24-.38A9.77 9.77 0 012.18 12c0-5.41 4.41-9.82 9.82-9.82 5.41 0 9.82 4.41 9.82 9.82 0 5.41-4.41 9.82-9.82 9.82z"/></svg>';
  var phoneSVG = '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>';

  var div = document.createElement('div');
  div.className = 'cv-hero';
  div.innerHTML = [
    '<div class="cv-inner">',
    '  <div class="cv-left">',
    '    <div class="cv-badge">' + cfg.badge + '</div>',
    '    <p class="cv-hook">' + cfg.hook + '</p>',
    '    <div class="cv-trust">',
    '      <span>' + checkSVG + '15+ Years UAE</span>',
    '      <span>' + checkSVG + 'In-House Team</span>',
    '      <span>' + checkSVG + 'Warranty Included</span>',
    '      <span>' + checkSVG + 'Free Site Visit</span>',
    '    </div>',
    '  </div>',
    '  <div class="cv-right">',
    '    <div class="cv-price">' + cfg.price + '</div>',
    '    <a href="' + waURL + '" class="cv-wa" target="_blank" rel="noopener">' + waSVG + 'Get Free Quote</a>',
    '    <a href="tel:+971526455121" class="cv-call">' + phoneSVG + 'Call Now</a>',
    '  </div>',
    '</div>'
  ].join('\n');

  // ── Inject after nav, before hero ──
  var nav = document.querySelector('nav');
  if (nav && nav.nextElementSibling) {
    nav.parentNode.insertBefore(div, nav.nextElementSibling);
  } else {
    // Fallback: prepend to main
    var main = document.querySelector('main');
    if (main) main.insertBefore(div, main.firstChild);
  }

  // ── Track view for analytics ──
  if (typeof gtag === 'function') {
    gtag('event', 'conversion_hero_view', {
      event_category: 'engagement',
      event_label: cfg.badge,
      non_interaction: true
    });
  }

  // ── Track WhatsApp click ──
  var waBtn = div.querySelector('.cv-wa');
  if (waBtn) {
    waBtn.addEventListener('click', function() {
      if (typeof gtag === 'function') {
        gtag('event', 'conversion_hero_wa_click', {
          event_category: 'conversion',
          event_label: cfg.badge
        });
      }
    });
  }

})();
