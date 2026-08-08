import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const INTERESTS = new Set([
  'Single Membership',
  'Couples Membership',
  'Personal Training',
  'Nutrition Coaching',
  'Just Visiting / Free Tour',
]);

const NOTIFY_EMAIL = process.env.LEAD_NOTIFY_EMAIL || 'strongfist000@gmail.com';
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// Reused across warm invocations of the same function instance.
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

// Best-effort only: each cold serverless instance starts with an empty map,
// so this does not guarantee a hard limit across all traffic.
const recentSubmissions = new Map<string, number>();
function isRateLimited(phone: string): boolean {
  const last = recentSubmissions.get(phone);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return true;
  recentSubmissions.set(phone, now);
  if (recentSubmissions.size > 500) {
    for (const [key, ts] of recentSubmissions) {
      if (now - ts > RATE_LIMIT_WINDOW_MS) recentSubmissions.delete(key);
    }
  }
  return false;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '');
  return /^\d{10}$/.test(digits) ? digits : null;
}

async function insertLead(row: {
  name: string; phone: string; email: string | null; interest: string | null;
  message: string | null; source_page: string | null;
}): Promise<boolean> {
  try {
    await getPool().query(
      `INSERT INTO leads (name, phone, email, interest, message, source_page)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [row.name, row.phone, row.email, row.interest, row.message, row.source_page]
    );
    return true;
  } catch (err) {
    console.error('leads: db insert failed', err);
    return false;
  }
}

async function sendNotificationEmail(row: {
  name: string; phone: string; email: string | null; interest: string | null;
  message: string | null; source_page: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('leads: RESEND_API_KEY not set, skipping email');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'StrongFist Leads <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `New lead: ${row.name} — ${row.interest || 'General enquiry'}`,
        text: [
          `Name: ${row.name}`,
          `Phone: ${row.phone}`,
          `Email: ${row.email || '-'}`,
          `Interest: ${row.interest || '-'}`,
          `Message: ${row.message || '-'}`,
          `Source page: ${row.source_page || '-'}`,
        ].join('\n'),
      }),
    });
    if (!res.ok) {
      console.error('leads: resend send failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('leads: email send threw', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};

  // Honeypot: bots that fill hidden fields get a fake success, silently.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const interest = typeof body.interest === 'string' && INTERESTS.has(body.interest.trim())
    ? body.interest.trim()
    : null;
  const message = typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null;
  const source_page = typeof body.source_page === 'string' ? body.source_page.trim() : null;

  if (!name) {
    return res.status(400).json({ ok: false, error: 'Name is required.' });
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit phone number.' });
  }

  if (isRateLimited(phone)) {
    return res.status(429).json({ ok: false, error: 'Already received your message — we\'ll be in touch shortly.' });
  }

  const row = { name, phone, email, interest, message, source_page };
  const [dbOk, emailOk] = await Promise.all([insertLead(row), sendNotificationEmail(row)]);

  if (!dbOk && !emailOk) {
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please call or WhatsApp us directly.' });
  }
  return res.status(200).json({ ok: true });
}
