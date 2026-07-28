import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

const premiumFeatures = [
  '500 photo and value analyses each membership year',
  'Make, model, and serial-number help from photos',
  'Replacement Value Assist and saved comparable links',
  'Private household records, autosave, and incident packets'
];

export function PricingPage() {
  return <main className="pricingPage">
    <header className="landingNav pricingNav">
      <a className="accountBrand pricingBrand" href="/"><ShieldCheck /><b>ProofVault</b></a>
      <div className="landingNavActions"><a href="/">Home</a><a href="/#demo">Try the demo</a><a href="/#early-access">Join early access</a></div>
    </header>

    <section className="pricingHero">
      <p className="eyebrow green">FOUNDING HOUSEHOLD OFFER</p>
      <h1>Protect your home records for less while ProofVault grows.</h1>
      <p>For the first 500 paid customers, Premium is half price for two years. You get the full photo-first workflow—then decide whether to stay when the founding period ends.</p>
      <div className="pricingHeroActions"><a className="primary pricingPrimary" href="/#early-access">Join the early-access list <ArrowRight /></a><a className="pricingBackLink" href="/"><ArrowLeft /> Back to ProofVault</a></div>
      <small>Available to the first 500 paid customers. Joining early access is free and does not reserve a founding spot.</small>
    </section>

    <section className="pricingCards" aria-label="ProofVault pricing">
      <article className="priceCard freePlan">
        <p className="eyebrow">START FREE</p>
        <h2>Free</h2>
        <div className="price"><strong>$0</strong><span>forever</span></div>
        <p>Start your inventory at your own pace. No card required.</p>
        <ul><li><Check />Manual inventory and values</li><li><Check />Three Try Before You Buy photo analyses</li><li><Check />Private account and autosave</li></ul>
        <a href="/#early-access">Join early access <ArrowRight /></a>
      </article>

      <article className="priceCard foundingPlan">
        <span className="priceBadge">BEST FOUNDING VALUE</span>
        <p className="eyebrow green">FIRST 500 PAID CUSTOMERS</p>
        <h2>Founding Annual</h2>
        <div className="price"><strong>$29.99</strong><span>per year for 2 years</span></div>
        <p className="priceSub">That is about $2.50/month, paid annually.</p>
        <ul>{premiumFeatures.map(feature => <li key={feature}><Check />{feature}</li>)}</ul>
        <a className="primary" href="/#early-access">Get notified when checkout opens <ArrowRight /></a>
        <small>Renews at the current annual price of $49.99/year after your second paid year.</small>
      </article>

      <article className="priceCard monthlyPlan">
        <p className="eyebrow green">FIRST 500 PAID CUSTOMERS</p>
        <h2>Founding Monthly</h2>
        <div className="price"><strong>$2.99</strong><span>per month for 2 years</span></div>
        <p className="priceSub">Half of the current $5.99 monthly rate.</p>
        <ul>{premiumFeatures.map(feature => <li key={feature}><Check />{feature}</li>)}</ul>
        <a href="/#early-access">Get notified when checkout opens <ArrowRight /></a>
        <small>Moves to the current $5.99/month rate after 24 paid months.</small>
      </article>
    </section>

    <section className="planComparison" aria-labelledby="compare-plans">
      <div className="comparisonHeading"><p className="eyebrow green">WHAT CHANGES WITH PREMIUM</p><h2 id="compare-plans">Start free. Upgrade when the photo work matters.</h2><p>Free is useful for building records manually. Premium is for getting through a whole home faster and documenting the details that are hard to recreate later.</p></div>
      <div className="comparisonTable" role="region" aria-label="Free and Premium plan comparison" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Premium</th></tr></thead>
          <tbody>
            <tr><th scope="row">Manual item records, photos, and values</th><td><Check /><span>Included</span></td><td><Check /><span>Included</span></td></tr>
            <tr><th scope="row">Try Before You Buy photo analysis</th><td><span>3 total</span></td><td><Check /><span>Included</span></td></tr>
            <tr><th scope="row">Photo-based make, model, and serial-number help</th><td><span>Trial only</span></td><td><Check /><span>Included</span></td></tr>
            <tr><th scope="row">Replacement Value Assist and comparable links</th><td><span>Manual values only</span></td><td><Check /><span>Included</span></td></tr>
            <tr><th scope="row">Photo and value analyses</th><td><span>3 trial analyses</span></td><td><strong>500/year</strong></td></tr>
            <tr><th scope="row">Marketplace links in incident packets</th><td><span>-</span></td><td><Check /><span>Included</span></td></tr>
            <tr><th scope="row">Private account and autosave</th><td><Check /><span>Included</span></td><td><Check /><span>Included</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="pricingTerms">
      <div><Sparkles /><div><b>Simple, controlled photo analysis</b><p>Premium includes 500 analyses per membership year. Optional add-ons will be available for unusually large projects.</p></div></div>
      <div><LockKeyhole /><div><b>No surprise terms</b><p>Your founding price lasts for your first two paid years. The regular renewal price is shown above before you join.</p></div></div>
    </section>

    <section className="pricingFinePrint">
      <h2>Founding offer terms</h2>
      <p>The offer is limited to the first 500 customers who complete a paid Premium subscription, not the first 500 account sign-ups. The two-year founding rate begins with the first successful payment and applies while the subscription remains active. After that period, the subscription renews at the then-current standard rate shown above: $5.99/month or $49.99/year. Prices are in U.S. dollars and may exclude applicable taxes.</p>
      <p><b>Prototype notice:</b> ProofVault does not process payments yet. Joining early access does not charge you or reserve a founding spot; it lets you hear when checkout is available.</p>
    </section>
  </main>;
}
