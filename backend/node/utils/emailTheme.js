const BRAND = {
  name: "Anyra's Trove",
  green: '#2d5a1b',
  greenDark: '#1f3f12',
  yellow: '#f5c542',
  black: '#111827',
  white: '#ffffff',
  softBg: '#f8fbf4',
  softBorder: '#dde8d1',
  muted: '#6b7280'
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildThemedEmailHtml = ({
  title = BRAND.name,
  intro = '',
  body = '',
  footer = 'If you need help, reply to this email or contact our support team.',
  ctaText,
  ctaUrl,
  highlight = 'Notice',
} = {}) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .email-wrapper { padding: 12px 6px !important; }
        .email-container { border-radius: 12px !important; }
        .email-header { padding: 20px 16px !important; }
        .email-brand-title { font-size: 20px !important; letter-spacing: 1.5px !important; }
        .email-brand-tagline { font-size: 8px !important; letter-spacing: 3px !important; }
        .email-title { font-size: 22px !important; }
        .email-body { padding: 20px 16px !important; }
        .email-content { padding: 16px !important; font-size: 14px !important; }
        .otp-display { font-size: 22px !important; letter-spacing: 4px !important; padding: 12px 10px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f7f1;">
    <div class="email-wrapper" style="margin:0;padding:24px 12px;background:#f4f7f1;">
      <div class="email-container" style="max-width:640px;margin:0 auto;background:${BRAND.white};border:1px solid ${BRAND.softBorder};border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(17,24,39,0.10);">
        
        <div class="email-header" style="background:linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenDark} 100%);padding:28px 32px;text-align:center;border-bottom:4px solid ${BRAND.yellow};">
          <!-- Brand Logo Text -->
          <div style="margin-bottom:20px;">
            <div class="email-brand-title" style="margin:0;color:${BRAND.white};font-family:'Georgia',serif;font-size:24px;letter-spacing:2px;font-weight:700;">ANYRA'S TROVE</div>
            <div class="email-brand-tagline" style="font-family:'Arial',sans-serif;font-size:9px;color:${BRAND.yellow};letter-spacing:4.5px;text-transform:uppercase;margin-top:4px;">People First</div>
          </div>
          
          <div style="display:inline-block;background:rgba(245,197,66,0.16);color:${BRAND.yellow};border:1px solid rgba(245,197,66,0.35);padding:6px 12px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">
            ${escapeHtml(highlight)}
          </div>
          
          <h1 class="email-title" style="margin:0;color:${BRAND.white};font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
          ${intro ? `<p style="margin:10px 0 0;color:#eff7e8;font-size:14px;line-height:1.7;">${intro}</p>` : ''}
        </div>
        
        <div class="email-body" style="padding:30px 32px;color:${BRAND.black};">
          <div class="email-content" style="background:${BRAND.softBg};border:1px solid ${BRAND.softBorder};border-radius:14px;padding:20px 22px;font-size:15px;line-height:1.8;color:${BRAND.black};">
            ${body}
          </div>
          ${ctaText && ctaUrl ? `
            <div style="text-align:center;margin-top:26px;">
              <a href="${ctaUrl}" style="display:inline-block;background:${BRAND.green};color:${BRAND.white};text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:800;border:2px solid ${BRAND.yellow};box-shadow:0 10px 20px rgba(45,90,27,0.16);">
                ${escapeHtml(ctaText)}
              </a>
            </div>
          ` : ''}
          <div style="margin-top:24px;padding-top:18px;border-top:1px dashed ${BRAND.softBorder};font-size:12px;line-height:1.7;color:${BRAND.muted};">
            ${footer}
          </div>
        </div>
        
      </div>
    </div>
  </body>
  </html>
`;

module.exports = {
  BRAND,
  buildThemedEmailHtml,
};
