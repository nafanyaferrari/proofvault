// This public form writes through a serverless function so the browser never
// receives the Supabase service-role key. Keep that key in Vercel only.
declare const process: { env: Record<string, string | undefined> };

interface VercelRequest { method?: string; body?: unknown; }
interface VercelResponse { status(code: number): VercelResponse; json(payload: unknown): void; setHeader(name: string, value: string): void; }

interface WaitlistBody { firstName?: unknown; email?: unknown; updatesOptIn?: unknown; setupInterest?: unknown; website?: unknown; }

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });

  const body = (req.body ?? {}) as WaitlistBody;
  // Honeypot: accept the request without persisting it, which avoids helping bots tune themselves.
  if (text(body.website, 200)) return res.status(201).json({ message: 'Thanks for your interest.' });

  const firstName = text(body.firstName, 80);
  const email = text(body.email, 254).toLowerCase();
  if (firstName.length < 1) return res.status(400).json({ message: 'Please enter your first name.' });
  if (!validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return res.status(503).json({ message: 'Early-access sign-ups are not available yet. Please try again soon.' });

  const response = await fetch(`${url}/rest/v1/proofvault_waitlist?on_conflict=email`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({
      first_name: firstName,
      email,
      updates_opt_in: body.updatesOptIn === true,
      setup_interest: body.setupInterest === true,
      launch_notification_consent: true,
      source: 'website',
      last_submitted_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    console.error('[join-waitlist] Supabase write failed', { status: response.status });
    return res.status(503).json({ message: 'Early-access sign-ups are temporarily unavailable. Please try again soon.' });
  }

  return res.status(201).json({ message: 'Thanks for your interest.' });
}
