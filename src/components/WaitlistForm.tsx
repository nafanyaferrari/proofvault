import { FormEvent, useState } from 'react';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { joinWaitlist } from '../services/waitlistService';

export function WaitlistForm() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [updatesOptIn, setUpdatesOptIn] = useState(false);
  const [setupInterest, setSetupInterest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await joinWaitlist({ firstName: firstName.trim(), email: email.trim(), updatesOptIn, setupInterest });
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not save your early-access request.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="waitlistCard" id="early-access" aria-labelledby="early-access-title">
    <div>
      <p className="eyebrow green">EARLY ACCESS</p>
      <h2 id="early-access-title">Want ProofVault when it is ready?</h2>
      <p>Join the early-access list. We will send one email when ProofVault is ready to use. No payment, account, or inventory upload is required.</p>
      <div className="waitlistBenefits"><span><Check />No payment required</span><span><Check />Your details stay private</span></div>
    </div>
    {submitted ? <div className="waitlistSuccess" role="status"><Check /><div><b>You’re on the list.</b><p>Thanks, {firstName}. We’ll notify {email} when early access opens.</p></div></div> : <form onSubmit={submit}>
      {error && <div className="formError" role="alert">{error}</div>}
      <label>First name<input required value={firstName} onChange={event => setFirstName(event.target.value)} placeholder="Nate" autoComplete="given-name" maxLength={80} /></label>
      <label>Email address<input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" maxLength={254} /></label>
      <label className="waitlistCheckbox"><input type="checkbox" checked={setupInterest} onChange={event => setSetupInterest(event.target.checked)} /><span>I’d be interested in a guided home-inventory setup session.</span></label>
      <label className="waitlistCheckbox"><input type="checkbox" checked={updatesOptIn} onChange={event => setUpdatesOptIn(event.target.checked)} /><span>Also send me occasional product updates.</span></label>
      <button className="primary" disabled={busy}><Mail />{busy ? 'Joining…' : 'Notify me when it’s ready'}<ArrowRight /></button>
      <small>By joining, you agree that ProofVault may email you when early access opens. You can opt out of optional updates at any time.</small>
    </form>}
  </section>;
}
