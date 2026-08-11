import type { APIRoute } from 'astro';
import { subscribe } from '../../lib/mailerlite';

// The only on-demand route on the site. Everything else stays prerendered.
export const prerender = false;

/**
 * The /overheads-review capture page. Every signup lands in a single group,
 * whose MailerLite automation sends exactly one email — the case-study
 * delivery — and nothing else. Campaign attribution rides along as custom
 * fields (utm_source / utm_medium / utm_campaign), read from the page URL.
 */
const GROUP = 'commercial-edge-01';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ success: false, message: 'Malformed request.' }, 400);
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  // Honeypot — a bot fills this, a human never sees it. Return a success
  // shape so the bot has nothing to learn from the response.
  if (str(data.botcheck)) return json({ success: true }, 200);

  const email = str(data.email).toLowerCase();

  if (!EMAIL_RE.test(email))
    return json({ success: false, message: 'Please enter a valid email address.' }, 400);

  // UTM attribution from the page URL; anything missing defaults to 'direct'.
  const utm = {
    source: str(data.utm_source) || 'direct',
    medium: str(data.utm_medium) || 'direct',
    campaign: str(data.utm_campaign) || 'direct',
  };

  try {
    await subscribe({ email, group: GROUP, utm });
  } catch (err) {
    // Log the real reason server-side; keep the visitor-facing message generic.
    console.error('MailerLite subscribe failed:', err);
    return json(
      { success: false, message: 'We could not send the file just then. Please try again.' },
      502,
    );
  }

  return json({ success: true }, 200);
};
