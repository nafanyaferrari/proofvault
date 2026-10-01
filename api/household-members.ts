// Household invitations run on the server because looking up an account by
// email requires the Supabase service-role key. Never move this work client-side.
declare const process: { env: Record<string, string | undefined> };

interface RequestLike { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown; }
interface ResponseLike { status(code: number): ResponseLike; json(value: unknown): void; setHeader(name: string, value: string): void; }
interface SupabaseUser { id: string; email?: string; }

const value = (headers: RequestLike['headers'], name: string) => {
  const header = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(header) ? header[0] : header;
};
const email = (input: unknown) => typeof input === 'string' ? input.trim().toLowerCase() : '';
const validEmail = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

function config() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Household sharing is not configured on the server.');
  return { url, key };
}
function serviceHeaders(key: string, extra: Record<string, string> = {}) { return { apikey: key, authorization: `Bearer ${key}`, ...extra }; }

async function signedInUser(req: RequestLike, url: string, key: string) {
  const authorization = value(req.headers, 'authorization');
  if (!authorization) return;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization } });
  if (!response.ok) return;
  return await response.json() as SupabaseUser;
}
async function householdOwner(url: string, key: string, userId: string) {
  const response = await fetch(`${url}/rest/v1/rpc/proofvault_household_owner_for_user`, { method: 'POST', headers: serviceHeaders(key, { 'content-type': 'application/json' }), body: JSON.stringify({ target_user_id: userId }) });
  if (!response.ok) throw new Error('Could not load household access.');
  const ownerId = await response.json() as unknown;
  return typeof ownerId === 'string' && ownerId ? ownerId : userId;
}
async function membersForOwner(url: string, key: string, ownerId: string) {
  const response = await fetch(`${url}/rest/v1/proofvault_household_members?owner_user_id=eq.${encodeURIComponent(ownerId)}&select=member_user_id,accepted_at`, { headers: serviceHeaders(key) });
  if (!response.ok) throw new Error('Could not load household members.');
  return await response.json() as Array<{ member_user_id: string; accepted_at: string }>;
}
async function allUsers(url: string, key: string) {
  const response = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: serviceHeaders(key) });
  if (!response.ok) throw new Error('Could not look up that AssetVault account.');
  const payload = await response.json() as { users?: SupabaseUser[] };
  return payload.users ?? [];
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('cache-control', 'no-store');
  try {
    const { url, key } = config();
    const user = await signedInUser(req, url, key);
    if (!user) return res.status(401).json({ message: 'Sign in before managing household access.' });
    const ownerId = await householdOwner(url, key, user.id);

    if (req.method === 'GET') {
      const members = await membersForOwner(url, key, ownerId);
      const users = await allUsers(url, key);
      return res.status(200).json({ owner: ownerId === user.id, members: members.map(member => ({ email: users.find(account => account.id === member.member_user_id)?.email ?? 'Connected account', acceptedAt: member.accepted_at })) });
    }
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed.' });
    if (ownerId !== user.id) return res.status(403).json({ message: 'Only the household owner can manage access.' });
    const body = (req.body ?? {}) as { action?: unknown; email?: unknown };
    const action = body.action === 'remove' ? 'remove' : 'invite';
    const memberEmail = email(body.email);
    if (!validEmail(memberEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    const users = await allUsers(url, key);
    const member = users.find(account => account.email?.toLowerCase() === memberEmail);
    if (!member) return res.status(404).json({ message: 'That person needs to create a AssetVault account first, then try again.' });
    if (member.id === user.id) return res.status(400).json({ message: 'Use a different AssetVault account for the household member.' });

    const memberOwnerId = await householdOwner(url, key, member.id);
    if (action === 'invite' && memberOwnerId !== member.id) return res.status(409).json({ message: 'That account already belongs to another shared household.' });

    if (action === 'remove') {
      const response = await fetch(`${url}/rest/v1/proofvault_household_members?owner_user_id=eq.${encodeURIComponent(user.id)}&member_user_id=eq.${encodeURIComponent(member.id)}`, { method: 'DELETE', headers: serviceHeaders(key) });
      if (!response.ok) throw new Error('Could not remove the household member.');
      return res.status(200).json({ message: 'Household access removed.' });
    }
    const existing = await membersForOwner(url, key, user.id);
    if (existing.some(row => row.member_user_id === member.id)) return res.status(200).json({ message: 'That account already has household access.' });
    if (existing.length >= 1) return res.status(409).json({ message: 'This household already has its one connected member.' });
    const response = await fetch(`${url}/rest/v1/proofvault_household_members`, { method: 'POST', headers: serviceHeaders(key, { 'content-type': 'application/json', prefer: 'return=minimal' }), body: JSON.stringify({ owner_user_id: user.id, member_user_id: member.id }) });
    if (!response.ok) throw new Error('Could not connect that household account.');
    return res.status(201).json({ message: `${memberEmail} can now access this household. They should refresh AssetVault after signing in.` });
  } catch (error) {
    console.error('[household-members] failed', { message: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(503).json({ message: error instanceof Error ? error.message : 'Household access is temporarily unavailable.' });
  }
}
