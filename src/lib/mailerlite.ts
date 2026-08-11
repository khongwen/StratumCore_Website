/**
 * MailerLite (API v2 — connect.mailerlite.com) helper.
 *
 * Server-only. Never import this from a client-side script: it reads the
 * API key, which must not reach the browser bundle.
 *
 * The only required configuration is MAILERLITE_API_KEY. Groups and custom
 * fields are resolved by name at runtime and created if they don't exist
 * yet, so a fresh MailerLite account needs no manual setup. Resolved IDs are
 * cached in module scope for the lifetime of the serverless instance.
 */

const API = 'https://connect.mailerlite.com/api';

/**
 * Custom fields this site writes.
 *
 * `key` is what the subscribe payload uses; `name` is the display name shown
 * in the MailerLite UI, which MailerLite slugifies into the key on creation.
 *
 * Note the provenance field is `signup_source`, not `source` — MailerLite
 * reserves "source" for its own built-in subscriber property and rejects a
 * custom field by that name with a 422.
 */
const CUSTOM_FIELDS = [
  { key: 'utm_source',   name: 'UTM source',   type: 'text' },
  { key: 'utm_medium',   name: 'UTM medium',   type: 'text' },
  { key: 'utm_campaign', name: 'UTM campaign', type: 'text' },
] as const;

export type SubscribePayload = {
  email: string;
  /** Group name, e.g. 'commercial-edge-01' */
  group: string;
  /** Campaign attribution from the page URL; each defaults to 'direct'. */
  utm: {
    source: string;
    medium: string;
    campaign: string;
  };
};

const groupIdCache = new Map<string, string>();
let fieldsEnsured = false;

function apiKey(): string {
  const key = import.meta.env.MAILERLITE_API_KEY ?? process.env.MAILERLITE_API_KEY;
  if (!key) throw new Error('MAILERLITE_API_KEY is not set');
  return key;
}

async function ml(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey()}`,
      ...init.headers,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = json?.message || json?.error || res.statusText;
    throw new Error(`MailerLite ${init.method ?? 'GET'} ${path} → ${res.status}: ${detail}`);
  }
  return json;
}

/**
 * Resolve a group name to its ID, creating the group if it doesn't exist.
 * MailerLite's subscribe endpoint takes group IDs, not names.
 */
async function resolveGroupId(name: string): Promise<string> {
  const cached = groupIdCache.get(name);
  if (cached) return cached;

  const search = await ml(`/groups?filter[name]=${encodeURIComponent(name)}`);
  // filter[name] is a partial match, so confirm the exact name.
  let group = (search?.data ?? []).find((g: any) => g.name === name);

  if (!group) {
    const created = await ml('/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    group = created?.data;
  }

  if (!group?.id) throw new Error(`Could not resolve MailerLite group "${name}"`);

  groupIdCache.set(name, String(group.id));
  return String(group.id);
}

/**
 * Ensure every custom field in CUSTOM_FIELDS exists on the account.
 * MailerLite rejects a subscribe call that references an unknown field, so
 * this runs once per instance before the first subscribe.
 */
async function ensureCustomFields(): Promise<void> {
  if (fieldsEnsured) return;

  const existing = await ml('/fields?limit=250');
  const present = new Set((existing?.data ?? []).map((f: any) => f.key));

  for (const { key, name, type } of CUSTOM_FIELDS) {
    if (present.has(key)) continue;
    try {
      await ml('/fields', { method: 'POST', body: JSON.stringify({ name, type }) });
    } catch (err) {
      // Most likely a concurrent request created it between our read and write.
      // Log loudly rather than silently: a genuine rejection here (e.g. a
      // reserved field name) would otherwise show up only as a missing value
      // on every subscriber.
      console.error(`MailerLite: could not create field "${key}" (${name}):`, err);
    }
  }

  fieldsEnsured = true;
}

/**
 * Create or update a subscriber and add them to `group`.
 *
 * POST /subscribers is an upsert: an address that is already subscribed
 * returns 200 and has its fields and group membership merged, so the
 * already-subscribed case needs no special handling here — it simply
 * succeeds, which is what the caller shows the visitor.
 */
export async function subscribe(payload: SubscribePayload): Promise<void> {
  await ensureCustomFields();
  const groupId = await resolveGroupId(payload.group);

  await ml('/subscribers', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      fields: {
        utm_source: payload.utm.source,
        utm_medium: payload.utm.medium,
        utm_campaign: payload.utm.campaign,
      },
      groups: [groupId],
      status: 'active', // single opt-in — no confirmation email, instant delivery
    }),
  });
}
