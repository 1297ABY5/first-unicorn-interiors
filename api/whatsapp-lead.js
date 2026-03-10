/* ═══════════════════════════════════════
   WHATSAPP LEAD API — First Unicorn Interiors
   Vercel Serverless Function
   POST /api/whatsapp-lead
   1. Save lead to Supabase (fui_leads)
   2. Alert Bond on Telegram
   3. Return success + WhatsApp deep link
═══════════════════════════════════════ */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const WA_NUMBER = '971585658002';

module.exports = async function handler(req, res) {
  // CORS
  var origin = req.headers.origin || '';
  var allowed = ['https://firstunicorninteriors.com', 'https://www.firstunicorninteriors.com'];
  if (allowed.indexOf(origin) > -1) res.setHeader('Access-Control-Allow-Origin', origin);
  else res.setHeader('Access-Control-Allow-Origin', 'https://firstunicorninteriors.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, email, source, page_url, document_requested,
            service, message, utm_source, utm_medium, utm_campaign, utm_gclid } = req.body;

    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Clean phone — ensure +971 format
    let cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '971' + cleanPhone.slice(1);
    else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) cleanPhone = '971' + cleanPhone;
    else if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);

    // Validate UAE mobile
    if (!/^9715\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Invalid UAE mobile number' });
    }

    const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' });

    // 1. Save to Supabase
    let supabaseOk = false;
    if (SUPABASE_KEY) {
      try {
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/fui_leads`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            name: name || null,
            phone: cleanPhone,
            email: email || null,
            source: source || 'website',
            page_url: page_url || null,
            document_requested: document_requested || null,
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            utm_gclid: utm_gclid || null,
            notes: service ? `Service: ${service}` + (message ? `\nMessage: ${message}` : '') : (message || null)
          })
        });
        supabaseOk = sbRes.ok;
        if (!sbRes.ok) console.error('Supabase error:', sbRes.status, await sbRes.text());
      } catch (e) {
        console.error('Supabase failed:', e.message);
      }
    }

    // 2. Alert Bond on Telegram
    if (TELEGRAM_BOT && TELEGRAM_CHAT) {
      try {
        const emoji = document_requested ? '\ud83d\udcc4' : '\ud83d\udcde';
        const lines = [
          `\ud83d\udd25 NEW FUI LEAD`,
          `\ud83d\udcde +${cleanPhone}`,
          name ? `\ud83d\udc64 ${name}` : null,
          email ? `\ud83d\udce7 ${email}` : null,
          document_requested ? `${emoji} Downloaded: ${document_requested}` : null,
          service ? `\ud83d\udee0 Service: ${service}` : null,
          message ? `\ud83d\udcac "${message}"` : null,
          page_url ? `\ud83d\udccd Page: ${page_url}` : null,
          utm_campaign ? `\ud83c\udfaf Campaign: ${utm_campaign}` : null,
          utm_gclid ? `\ud83d\udcb0 Google Ads click` : null,
          `\ud83d\udd52 ${timestamp}`
        ].filter(Boolean).join('\n');

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT,
            text: lines,
            parse_mode: 'HTML'
          })
        });
      } catch (e) {
        console.error('Telegram alert failed:', e.message);
      }
    }

    // 3. Build WhatsApp deep link for the visitor
    let waText = '';
    if (document_requested) {
      waText = `Hi, I just downloaded the ${document_requested} from your website.\n\n`;
      if (name) waText += `Name: ${name}\n`;
      if (service) waText += `Interest: ${service}\n`;
      waText += `\nI'd love to discuss my project.`;
    } else {
      waText = `Hi, I'd like a free quote for ${service || 'renovation'}.\n\n`;
      if (name) waText += `Name: ${name}\n`;
      waText += `Phone: +${cleanPhone}\n`;
      if (message) waText += `Details: ${message}\n`;
    }

    const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`;

    return res.status(200).json({
      success: true,
      saved: supabaseOk,
      whatsapp_url: waUrl
    });

  } catch (err) {
    console.error('Lead API error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
