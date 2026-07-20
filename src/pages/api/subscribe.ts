import type { APIRoute } from 'astro';
import { subscribe } from '../../lib/mailerlite';

// The only on-demand route on the site. Everything else stays prerendered.
export const prerender = false;

/**
 * Traffic routing for the /toolkit page, keyed off the ?src= query param.
 * The QR code printed on the event card carries ?src=card; anything that
 * finds the page later lands in the organic group.
 */
const SOURCES: Record<string, { group: string; source: string }> = {
  card: { group: 'commercial-edge-01', source: 'joblin-event-01' },
};

const FALLBACK = { group: 'toolkit-organic', source: 'toolkit-organic' };

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

  const name = str(data.name);
  const email = str(data.email).toLowerCase();

  if (!name) return json({ success: false, message: 'Please enter your first name.' }, 400);
  if (!EMAIL_RE.test(email))
    return json({ success: false, message: 'Please enter a valid email address.' }, 400);

  const { group, source } = SOURCES[str(data.src).toLowerCase()] ?? FALLBACK;

  try {
    await subscribe({
      email,
      name,
      company: str(data.company),
      role: str(data.role),
      group,
      source,
    });
  } catch (err) {
    // Log the real reason server-side; keep the visitor-facing message generic.
    console.error('MailerLite subscribe failed:', err);
    return json(
      { success: false, message: 'We could not send the toolkit just then. Please try again.' },
      502,
    );
  }

  return json({ success: true }, 200);
};
