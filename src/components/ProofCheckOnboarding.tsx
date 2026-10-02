import { Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { primaryConcerns, primaryUseCases, type AssetVaultActivation, type PrimaryConcern, type PrimaryUseCase } from '../services/activationService';

export function ProofCheckOnboarding({ activation, save, finish }: { activation: AssetVaultActivation; save: (patch: Partial<AssetVaultActivation>) => void; finish: () => void }) {
  const useCase = activation.primaryUseCase;
  const concern = activation.primaryConcern;
  const step = !useCase ? 1 : !concern ? 2 : 3;
  return <main className="onboardingPage">
    <header className="onboardingBrand"><ShieldCheck /><b>AssetVault</b></header>
    <section className="onboardingCard">
      <p className="eyebrow green">ASSETVAULT PROOF CHECK</p>
      <div className="onboardingProgress" aria-label={`Onboarding step ${step} of 3`}><span className={step >= 1 ? 'done' : ''}>1</span><i /><span className={step >= 2 ? 'done' : ''}>2</span><i /><span className={step >= 3 ? 'done' : ''}>3</span></div>
      {step === 1 && <><h1>What are you trying to protect?</h1><p>We will tailor your Proof Readiness Check around the things and places that matter most.</p><div className="choiceGrid">{primaryUseCases.map(choice => <button key={choice} onClick={() => save({ primaryUseCase: choice as PrimaryUseCase })}>{choice}<ChevronRight /></button>)}</div></>}
      {step === 2 && <><button className="back" onClick={() => save({ primaryUseCase: undefined })}>Back</button><h1>What is your biggest concern?</h1><p>Choose the situation you want to be prepared for first.</p><div className="choiceGrid">{primaryConcerns.map(choice => <button key={choice} onClick={() => save({ primaryConcern: choice as PrimaryConcern })}>{choice}<ChevronRight /></button>)}</div></>}
      {step === 3 && <><button className="back" onClick={() => save({ primaryConcern: undefined })}>Back</button><h1>Most people cannot prove what they own fast enough.</h1><p>If something happened tonight, many people would struggle to provide photos, serial numbers, owner-applied markings, receipts, and replacement values. AssetVault helps you build that proof before you need it.</p><div className="riskStatement"><Check /><div><b>Your starting focus</b><span>{useCase} · {concern}</span></div></div><section className="challengeIntro"><p className="eyebrow green">TOP 10 ASSETS CHALLENGE</p><h2>Start with what you would most regret losing.</h2><p>Document the 10 items you would most want to prove after a theft, fire, flood, or claim: jewelry, tools, electronics, bikes, instruments, cameras, outdoor equipment, collectibles, storage contents, trailer equipment, or business equipment.</p></section><button className="primary onboardingPrimary" onClick={finish}>Start my Top 10 Assets Challenge <ChevronRight /></button><small>Proof Check stays useful and free: document your first 10–15 items, see the gaps, and decide later whether Complete is worth it.</small></>}
    </section>
  </main>;
}
