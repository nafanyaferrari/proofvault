import type { InventoryItem } from '../types';
import { completenessScore } from './completeness';

const activationKey = 'assetvault-activation';
const analyticsKey = 'assetvault-local-analytics';

export const primaryUseCases = ['Homeowner/renter', 'Storage unit tenant', 'Contractor/tools', 'Small business', 'Jewelry/valuables', 'Vehicle/trailer', 'Church/nonprofit', 'Other'] as const;
export const primaryConcerns = ['Theft or burglary', 'Fire', 'Flood/water damage', 'Storm/hail/tornado', 'Storage-unit break-in', 'Vehicle burglary', 'Moving loss', 'Insurance claim preparation', 'General organization'] as const;
export type PrimaryUseCase = typeof primaryUseCases[number];
export type PrimaryConcern = typeof primaryConcerns[number];
export type ActivationEvent = 'onboarding_started'|'use_case_selected'|'concern_selected'|'proof_check_started'|'first_asset_added'|'five_assets_added'|'top_10_challenge_completed'|'proof_score_viewed'|'upgrade_prompt_viewed'|'value_assist_clicked'|'incident_created'|'incident_packet_started'|'incident_packet_upgrade_clicked'|'partner_referral_code_entered'|'share_prompt_viewed';

export interface AssetVaultActivation {
  primaryUseCase?: PrimaryUseCase;
  primaryConcern?: PrimaryConcern;
  proofCheckStartedAt?: string;
  referralCode?: string;
  partnerId?: string;
  partnerName?: string;
  partnerType?: string;
  referralSource?: string;
  shownMilestones?: string[];
}

export interface ProofReadiness {
  totalAssets: number;
  totalEstimatedValue: number;
  missingSerials: number;
  missingOwnerMarks: number;
  missingPhotos: number;
  missingValues: number;
  missingReceiptsOrAppraisals: number;
  claimReady: number;
  score: number;
}

export function loadActivation(): AssetVaultActivation {
  try { return JSON.parse(localStorage.getItem(activationKey) || '{}') as AssetVaultActivation; } catch { return {}; }
}
export function saveActivation(value: AssetVaultActivation) { localStorage.setItem(activationKey, JSON.stringify(value)); }
export function clearActivation() { localStorage.removeItem(activationKey); localStorage.removeItem(analyticsKey); }

/** Local-only placeholder event log. It is never sent to an analytics vendor. */
export function trackActivationEvent(event: ActivationEvent, detail?: Record<string, string | number>) {
  try {
    const prior = JSON.parse(localStorage.getItem(analyticsKey) || '[]') as Array<{ event: ActivationEvent; at: string; detail?: Record<string, string | number> }>;
    localStorage.setItem(analyticsKey, JSON.stringify([...prior.slice(-99), { event, at: new Date().toISOString(), detail }]));
  } catch { /* A full browser store should never block a user's inventory work. */ }
}

export function proofReadiness(items: InventoryItem[]): ProofReadiness {
  const active = items.filter(item => !item.archivedAt);
  const totalAssets = active.length;
  const score = totalAssets ? Math.round(active.reduce((sum, item) => sum + completenessScore(item).score, 0) / totalAssets) : 0;
  return {
    totalAssets,
    totalEstimatedValue: active.reduce((sum, item) => sum + (item.estimatedReplacementValueSelected ?? item.userEnteredValue ?? 0), 0),
    missingSerials: active.filter(item => !item.serialNumber?.trim()).length,
    missingOwnerMarks: active.filter(item => !item.ownerMarking?.trim()).length,
    missingPhotos: active.filter(item => !item.photos.length).length,
    missingValues: active.filter(item => !(item.userEnteredValue || item.estimatedReplacementValueSelected)).length,
    missingReceiptsOrAppraisals: active.filter(item => !(item.receiptFiles.length || item.appraisalFiles.length)).length,
    claimReady: active.filter(item => completenessScore(item).score >= 70).length,
    score
  };
}
