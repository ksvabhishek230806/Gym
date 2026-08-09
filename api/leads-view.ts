import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { timingSafeEqual } from 'crypto';

// Reused across warm invocations of the same function instance.
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function passwordMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Lead fields are free text typed by the public, so everything is escaped.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: unknown): string {
  const d = new Date(value as string);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface LeadRow {
  name: string; phone: string; email: string | null;
  interest: string | null; message: string | null; created_at: string;
}

function renderCard(row: LeadRow): string {
  const digits = String(row.phone || '').replace(/\D/g, '');
  return `
    <article class="card">
      <div class="top">
        <span class="name">${esc(row.name)}</span>
        <span class="when">${esc(formatDate(row.created_at))}</span>
      </div>
      ${row.interest ? `<p class="interest">${esc(row.interest)}</p>` : ''}
      <p class="phone">${esc(row.phone)}</p>
      ${row.email ? `<p class="email">${esc(row.email)}</p>` : ''}
      ${row.message ? `<p class="message">${esc(row.message)}</p>` : ''}
      <div class="actions">
        <a class="btn call" href="tel:${esc(digits)}">Call</a>
        <a class="btn wa" href="https://wa.me/91${esc(digits)}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </article>`;
}

function renderPage(rows: LeadRow[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Leads | StrongFist</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 20px 16px 48px; background: #000; color: #fff;
         font-family: Inter, system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  h1 { font-family: 'Bebas Neue', Inter, sans-serif; font-size: 34px;
       letter-spacing: .04em; margin: 0 0 4px; }
  .count { color: rgba(255,255,255,.5); font-size: 13px; margin: 0 0 22px; }
  .card { background: #111; border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .top { display: flex; justify-content: space-between; align-items: baseline;
         gap: 10px; margin-bottom: 6px; }
  .name { font-weight: 700; font-size: 17px; }
  .when { color: rgba(255,255,255,.4); font-size: 12px; white-space: nowrap; }
  .interest { color: #f87171; font-size: 12px; font-weight: 600;
              text-transform: uppercase; letter-spacing: .08em; margin: 0 0 8px; }
  .phone { font-size: 15px; margin: 0 0 2px; }
  .email { color: rgba(255,255,255,.6); font-size: 14px; margin: 0 0 2px;
           word-break: break-all; }
  .message { color: rgba(255,255,255,.75); font-size: 14px; line-height: 1.5;
             margin: 10px 0 0; white-space: pre-wrap; }
  .actions { display: flex; gap: 10px; margin-top: 14px; }
  .btn { flex: 1; text-align: center; padding: 12px; border-radius: 999px;
         font-size: 13px; font-weight: 700; text-transform: uppercase;
         letter-spacing: .06em; text-decoration: none; color: #fff; }
  .call { background: #dc2626; }
  .wa { background: #128c7e; }
  .empty { color: rgba(255,255,255,.5); font-size: 14px; }
  @media (min-width: 640px) { body { max-width: 720px; margin: 0 auto; } }
</style>
</head>
<body>
  <h1>LEADS</h1>
  <p class="count">${rows.length} total &middot; newest first</p>
  ${rows.length ? rows.map(renderCard).join('') : '<p class="empty">No leads yet.</p>'}
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expected = process.env.LEADS_PASSWORD || '';
  if (!expected) {
    console.error('leads-view: LEADS_PASSWORD is not set');
    return res.status(500).send('Lead view is not configured.');
  }

  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const [scheme, encoded] = header.split(' ');
  let authorized = false;
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    // Username is ignored — a single shared password is the only credential.
    if (separator !== -1) authorized = passwordMatches(decoded.slice(separator + 1), expected);
  }

  if (!authorized) {
    res.setHeader('WWW-Authenticate', 'Basic realm="StrongFist Leads", charset="UTF-8"');
    return res.status(401).send('Authentication required.');
  }

  try {
    const { rows } = await getPool().query<LeadRow>(
      `SELECT name, phone, email, interest, message, created_at
         FROM leads
        ORDER BY created_at DESC`
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(renderPage(rows));
  } catch (err) {
    console.error('leads-view: db query failed', err);
    return res.status(500).send('Could not load leads.');
  }
}
