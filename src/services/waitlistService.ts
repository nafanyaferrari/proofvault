export interface WaitlistInterest {
  firstName: string;
  email: string;
  updatesOptIn: boolean;
  setupInterest: boolean;
}

interface WaitlistResponse {
  message?: string;
}

export async function joinWaitlist(interest: WaitlistInterest) {
  const response = await fetch('/api/join-waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(interest)
  });

  const body = await response.json().catch(() => ({})) as WaitlistResponse;
  if (!response.ok) throw new Error(body.message || 'We could not save your early-access request. Please try again.');
}
