import type { SubscriptionTier } from './types';

export type AssetVaultPlan =
  | 'proof-check'
  | 'complete'
  | 'family'
  | 'incident-packet'
  | 'incident-complete'
  | 'business-solo'
  | 'business-team'
  | 'partner';

export interface PlanDetails {
  id: AssetVaultPlan;
  name: string;
  price: string;
  cadence: string;
  outcome: string;
  audience: string;
  features: string[];
  access: SubscriptionTier;
}

export const assetVaultPlans: PlanDetails[] = [
  { id: 'proof-check', name: 'AssetVault Proof Check', price: 'Free', cadence: 'local-only', outcome: 'Find the proof gaps before they matter.', audience: 'A practical readiness audit for one home or storage space.', features: ['10–15 items', 'Item photos, Serial Tracker, and owner-applied markings', 'Manual values, basic Proof Score, one Vault Location', 'Top 10 valuables checklist and basic export'], access: 'free' },
  { id: 'complete', name: 'AssetVault Complete', price: '$49', cadence: 'per year or $6.99/month', outcome: 'Turn your inventory into claim-ready proof.', audience: 'The complete household record before theft, disaster, or loss.', features: ['Unlimited items, photos, documents, and Vault Locations', 'Serial Tracker, owner-applied markings, receipts, appraisals, and warranties', 'Photo descriptions, identifier recognition, and Value Assist', 'Incident Mode, Incident Packets, Claim Ready Reports, and annual review reminders'], access: 'premium' },
  { id: 'family', name: 'AssetVault Family', price: '$99', cadence: 'per year', outcome: 'Keep the whole household ready from one shared vault.', audience: 'Shared homes, multiple properties, and trusted family access.', features: ['Everything in Complete', 'Spouse/partner and household access', 'Multiple homes and storage units', 'Shared packets, family document vault, and review reminders'], access: 'premium' },
  { id: 'incident-packet', name: 'AssetVault Incident Packet', price: '$39', cadence: 'one time', outcome: 'Create the packet you need when something happens.', audience: 'For people who need an emergency police and insurance handoff.', features: ['One incident report packet for selected affected items', 'Serial Tracker and owner-applied markings evidence', 'Values and any saved Value Assist evidence', 'CSV, text, printable report, and basic sharing'], access: 'free' },
  { id: 'incident-complete', name: 'AssetVault Incident + Complete', price: '$59', cadence: 'first year', outcome: 'Handle today’s incident and be ready for the next one.', audience: 'A one-time incident path that converts to full protection.', features: ['One Incident Packet', 'One year of AssetVault Complete', 'Value Assist and saved comparable links', 'Claim Ready and Law Enforcement packet formats'], access: 'premium' },
  { id: 'business-solo', name: 'AssetVault Business Solo', price: '$199', cadence: 'per year or $19/month', outcome: 'Protect the equipment that keeps your work moving.', audience: 'If your trailer, shop, storage unit, or jobsite got hit tonight, could you prove what was stolen by morning?', features: ['Business asset and equipment inventory', 'Serial Tracker, owner-applied markings, and Value Assist', 'Trailer, jobsite, and storage unit Vault Locations', 'Incident Packets, insurance schedule export, and QR label support'], access: 'premium' },
  { id: 'business-team', name: 'AssetVault Business Team', price: '$499', cadence: 'per year or $49/month', outcome: 'Keep a small team accountable for every critical asset.', audience: 'Small teams with multiple users, jobsites, or storage locations.', features: ['Everything in Business Solo', 'Multiple users, employee assignment, and tool checkout', 'Team permissions and shared incident packets', 'Bulk import/export and an admin dashboard'], access: 'premium' },
  { id: 'partner', name: 'AssetVault Partner', price: 'Custom', cadence: 'partner pricing', outcome: 'Help clients, tenants, and members become claim-ready.', audience: 'Storage facilities, insurance agencies, restoration firms, and associations.', features: ['Co-branded Proof Check and preparedness campaigns', 'Referral codes and discounted user accounts', 'Educational handouts and partner dashboard', 'Revenue share or flat monthly pricing'], access: 'premium' }
];

export function planForId(id: AssetVaultPlan): PlanDetails {
  return assetVaultPlans.find(plan => plan.id === id) ?? assetVaultPlans[0];
}

export function planAccess(id: AssetVaultPlan): SubscriptionTier {
  return planForId(id).access;
}

export function loadMockPlan(tier: SubscriptionTier): AssetVaultPlan {
  const stored = localStorage.getItem('assetvault-mock-plan') as AssetVaultPlan | null;
  if (stored && assetVaultPlans.some(plan => plan.id === stored)) return stored;
  return tier === 'premium' ? 'complete' : 'proof-check';
}

export function saveMockPlan(plan: AssetVaultPlan) {
  localStorage.setItem('assetvault-mock-plan', plan);
}
