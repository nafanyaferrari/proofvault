import { Camera, ChevronRight, CircleDollarSign, FileText, PackageCheck, ShieldAlert, Tag } from 'lucide-react';
import { InventoryItem } from '../types';
import { completenessScore } from '../services/completeness';
import { itemReviewBacklog } from '../services/itemReview';
import { money } from '../lib/utils';

interface CoverageCenterViewProps { items: InventoryItem[]; open: (id: string) => void; }

const iconFor = (id: string) => id === 'add-photo' ? Camera : id === 'add-value' ? CircleDollarSign : id === 'add-supporting-doc' ? FileText : Tag;

export function CoverageCenterView({ items, open }: CoverageCenterViewProps) {
  const active = items.filter(item => !item.archivedAt);
  const backlog = itemReviewBacklog(active, 12);
  const documented = active.filter(item => completenessScore(item).score >= 70);
  const valueTotal = active.reduce((sum, item) => sum + (item.userEnteredValue ?? item.estimatedReplacementValueSelected ?? 0), 0);
  const valueMissing = active.filter(item => !item.userEnteredValue && !item.estimatedReplacementValueSelected).length;
  const readiness = active.length ? Math.round(documented.length / active.length * 100) : 0;
  return <>
    <header className="coverageHead"><p className="eyebrow green">COVERAGE CENTER</p><h1>See what is ready—and what could cost you later.</h1><p className="sub">AssetVault looks for the records that still need identification, proof, or a replacement value before an insurance or loss event.</p></header>
    <section className="coverageStats" aria-label="Coverage readiness summary">
      <div><PackageCheck /><span><b>{readiness}%</b><small>records well documented</small></span></div>
      <div><CircleDollarSign /><span><b>{money(valueTotal)}</b><small>recorded replacement value</small></span></div>
      <div><ShieldAlert /><span><b>{backlog.total}</b><small>records needing attention</small></span></div>
    </section>
    {active.length === 0 ? <section className="panel coverageEmpty"><PackageCheck /><h2>Your coverage picture starts with the first item.</h2><p>Add a photo or item record, then come back here for the next best documentation step.</p></section> : <>
      <section className="panel coveragePanel">
        <div className="coverageTitle"><div><p className="eyebrow green">READINESS</p><h2>{documented.length} of {active.length} active records are strong</h2><p>Strong records have the main identification, evidence, and value details needed to be useful later.</p></div><div className="coverageMeter" aria-label={`${readiness}% of active records are well documented`}><span style={{ width: `${readiness}%` }} /></div></div>
        <div className="coverageChecks"><span className={valueMissing ? 'needsWork' : 'ready'}>{valueMissing ? `${valueMissing} item${valueMissing === 1 ? '' : 's'} without a value` : 'Every item has a value'}</span><span className={backlog.countsByFlag['add-supporting-doc'] ? 'needsWork' : 'ready'}>{backlog.countsByFlag['add-supporting-doc'] ? `${backlog.countsByFlag['add-supporting-doc']} item${backlog.countsByFlag['add-supporting-doc'] === 1 ? '' : 's'} without purchase proof` : 'Purchase proof is present where recorded'}</span><span className={backlog.countsByFlag['add-make-model'] ? 'needsWork' : 'ready'}>{backlog.countsByFlag['add-make-model'] ? `${backlog.countsByFlag['add-make-model']} item${backlog.countsByFlag['add-make-model'] === 1 ? '' : 's'} missing make or model` : 'Make and model are filled in'}</span></div>
      </section>
      <section className="panel coveragePanel"><div className="sectionTitle"><div><p className="eyebrow green">BEST NEXT ACTIONS</p><h2>Close the gaps that matter most</h2><small>Start with identification and value; supporting documents can follow.</small></div></div>{backlog.records.length ? <div className="coverageRecordList">{backlog.records.map(({ item, flags }) => <button key={item.id} className="coverageRecord" onClick={() => open(item.id)}><div className="coverageRecordIcon"><ShieldAlert /></div><div><b>{item.itemName}</b><small>{item.location} · {flags.slice(0, 2).map(flag => flag.label).join(' · ')}</small></div><strong>{completenessScore(item).score}%</strong><ChevronRight /></button>)}</div> : <div className="coverageEmpty compact"><PackageCheck /><h3>Everything is in good shape.</h3><p>Keep the record current when you buy, replace, or maintain something important.</p></div>}</section>
      <section className="coverageIssueGrid">{backlog.issueSummary.map(issue => { const Icon = iconFor(issue.id); return <article className="panel coverageIssue" key={issue.id}><Icon /><div><b>{issue.count}</b><small>{issue.label.toLowerCase()} task{issue.count === 1 ? '' : 's'} waiting</small></div></article>; })}</section>
    </>}
  </>;
}
