import { FormEvent, useEffect, useState } from 'react';
import { Check, MailPlus, UserMinus, UsersRound } from 'lucide-react';
import { CloudStatus, cloudPersistenceService } from '../services/cloudPersistenceService';
import { supabase } from '../services/supabaseClient';
import type { SubscriptionTier } from '../types';

interface Member { email: string; acceptedAt: string; }

export function HouseholdAccessPanel({ status, tier, onUpgrade }: { status: CloudStatus; tier: SubscriptionTier; onUpgrade: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    if (!status.authenticated) return;
    const session = await cloudPersistenceService.status();
    if (!session.authenticated) return;
    const token = (await supabase?.auth.getSession())?.data.session?.access_token;
    if (!token) return;
    const response = await fetch('/api/household-members', { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({})) as { members?: Member[]; owner?: boolean; message?: string };
    if (!response.ok) throw new Error(body.message || 'Could not load household access.');
    setMembers(body.members ?? []); setOwner(Boolean(body.owner));
  };
  useEffect(() => { void load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load household access.')); }, [status.authenticated]);
  const change = async (action: 'invite' | 'remove', memberEmail: string) => {
    setBusy(true); setMessage(''); setError('');
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) throw new Error('Sign in before managing household access.');
      const response = await fetch('/api/household-members', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ action, email: memberEmail }) });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message || 'Household access could not be updated.');
      setMessage(body.message || 'Household access updated.'); setEmail(''); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Household access could not be updated.'); } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void change('invite', email); };
  return <section className="panel settings householdPanel"><div className="securityTitle"><UsersRound/><div><h2>Household access</h2><p>Connect one trusted AssetVault account so both people work from the same shared home inventory, documents, photo queue, and incident packets.</p></div></div>{tier==='free'?<div className="householdUpgrade"><b>Make sure your spouse or trusted contact can access this when needed.</b><p>AssetVault Family adds shared access, multiple places, and shared incident packets.</p><button className="primary" onClick={onUpgrade}>Preview AssetVault Family</button></div>:!status.authenticated ? <small>Sign in to manage household access.</small> : <>{message && <div className="inlineNotice"><Check/>{message}</div>}{error && <div className="formError" role="alert">{error}</div>}{owner ? <>{members.map(member => <div className="householdMember" key={member.email}><div><b>{member.email}</b><small>Connected {new Date(member.acceptedAt).toLocaleDateString()}</small></div><button disabled={busy} onClick={() => void change('remove', member.email)}><UserMinus/>Remove</button></div>)}{!members.length && <form className="householdInvite" onSubmit={submit}><label>Existing AssetVault account email<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="partner@example.com" /></label><button disabled={busy}><MailPlus/>{busy ? 'Connecting…' : 'Connect household member'}</button></form>}{!members.length && <small>They must create and sign in to their AssetVault account first. Their existing inventory stays separate; this connects them to your household from this point forward.</small>}</> : <p className="helper">You are connected to a shared household. The owner manages household access.</p>}</>}</section>;
}
