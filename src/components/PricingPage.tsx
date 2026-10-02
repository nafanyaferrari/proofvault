import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { assetVaultPlans } from '../productPlans';

export function PricingPage() {
  return <main className="pricingPage">
    <header className="landingNav pricingNav">
      <a className="accountBrand pricingBrand" href="/"><ShieldCheck /><b>AssetVault</b></a>
      <div className="landingNavActions"><a href="/">Home</a><a href="/#demo">Try the demo</a><a href="/#early-access">Join early access</a></div>
    </header>

    <section className="pricingHero">
      <p className="eyebrow green">PROOF OF OWNERSHIP BEFORE YOU NEED IT</p>
      <h1>Start free. See the proof you are missing.</h1>
      <p>AssetVault Proof Check helps you document the first items that matter most, see whether they are claim-ready, and choose more protection only when it becomes useful.</p>
      <div className="pricingHeroActions"><a className="primary pricingPrimary" href="/#early-access">Get notified when checkout opens <ArrowRight /></a><a className="pricingBackLink" href="/"><ArrowLeft /> Back to AssetVault</a></div>
      <small>No payment is collected yet. Choose the plan that fits your situation, then join early access for the launch notice.</small>
    </section>

    <section className="pricingJourney" aria-label="How AssetVault starts free">
      <article><span>1</span><div><p className="eyebrow green">START FREE WITH ASSETVAULT PROOF CHECK</p><h2>Find out whether your valuables are claim-ready.</h2><p>Use photos, Serial Tracker, owner-applied markings, manual values, and a basic Proof Score to get a real readiness diagnosis.</p></div></article>
      <article><span>2</span><div><p className="eyebrow green">DOCUMENT YOUR FIRST 10 HIGH-RISK ASSETS</p><h2>Focus on what you would most regret losing.</h2><p>Start with jewelry, tools, electronics, bikes, equipment, storage contents, and anything that would be hard to prove after a loss.</p></div></article>
      <article><span>3</span><div><p className="eyebrow green">UPGRADE WHEN YOU ARE READY</p><h2>Turn your inventory into claim-ready proof.</h2><p>Complete adds current replacement-value links, multiple locations, documents, shared access, and faster police and insurance packets.</p></div></article>
    </section>

    <section className="pricingCards assetVaultPricingCards" aria-label="AssetVault pricing">
      {assetVaultPlans.filter(plan=>plan.id!=='incident-complete').map(plan => <article className={`priceCard ${plan.id === 'complete' ? 'foundingPlan' : ''}`} key={plan.id}>
        {plan.id === 'complete' && <span className="priceBadge">MOST HOUSEHOLDS START HERE</span>}
        <p className="eyebrow green">{plan.cadence.toUpperCase()}</p>
        <h2>{plan.name.replace('AssetVault ', '')}</h2>
        <div className="price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
        <p className="priceSub">{plan.outcome}</p>
        <p>{plan.audience}</p>
        <ul>{plan.features.map(feature => <li key={feature}><Check />{feature}</li>)}</ul>
        <a className={plan.id === 'complete' ? 'primary' : ''} href="/#early-access">Choose this path <ArrowRight /></a>
      </article>)}
    </section>

    <section className="planComparison" aria-labelledby="compare-plans">
      <div className="comparisonHeading"><p className="eyebrow green">A CLEAR PATH FOR EVERY STAGE</p><h2 id="compare-plans">Start with proof. Add speed, sharing, or business controls when they matter.</h2><p>Proof Check makes a useful readiness audit free. Complete turns everyday inventory into claim-ready proof. Family and Business plans add the people and places that need to work together.</p></div>
      <p className="incidentOffer">Need a polished police and insurance packet? Create one Incident Packet for $39, or get the packet plus one year of AssetVault Complete for $59.</p><div className="comparisonTable" role="region" aria-label="AssetVault plan comparison" tabIndex={0}>
        <table><thead><tr><th scope="col">Outcome</th><th scope="col">Proof Check</th><th scope="col">Complete</th><th scope="col">Family / Business</th></tr></thead><tbody>
          <tr><th scope="row">Know what you can prove today</th><td><Check /><span>Basic Proof Score</span></td><td><Check /><span>Full Proof Score</span></td><td><Check /><span>Across people and places</span></td></tr>
          <tr><th scope="row">Identify and recover assets</th><td><span>Serials + owner-applied markings</span></td><td><Check /><span>Serial Tracker + evidence</span></td><td><Check /><span>Shared records and labels</span></td></tr>
          <tr><th scope="row">Estimate replacement cost</th><td><span>Manual values</span></td><td><Check /><span>Value Assist</span></td><td><Check /><span>Value Assist at scale</span></td></tr>
          <tr><th scope="row">Respond to an incident</th><td><span>Basic export</span></td><td><Check /><span>Claim Ready + Law Enforcement packets</span></td><td><Check /><span>Shared team and household packets</span></td></tr>
        </tbody></table>
      </div>
    </section>

    <section className="pricingTerms">
      <div><Sparkles /><div><b>Make the proof easier to build</b><p>Complete and above include photo-based descriptions, identifier recognition, and Value Assist—always review details before relying on them.</p></div></div>
      <div><LockKeyhole /><div><b>Keep the emergency path open</b><p>AssetVault Incident Packet is a one-time option for non-subscribers who need a focused police and insurance export.</p></div></div>
    </section>

    <section className="pricingFinePrint"><h2>Pricing availability</h2><p><b>Prototype notice:</b> AssetVault does not process payments yet. The plan cards describe the intended product; early-access registration does not charge you or reserve a plan.</p><p>Value Assist provides approximate replacement estimates from comparable listings. It is not an appraisal, guarantee of coverage, or confirmed insurance value.</p></section>
  </main>;
}
