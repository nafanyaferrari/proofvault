import { ExternalLink, FileText, ReceiptText, ShieldCheck, Wrench } from 'lucide-react';
import { InventoryItem } from '../types';
import { binderDocumentCount, expiringWarranties, maintenanceEntries, nextMaintenanceDate } from '../services/homeBinderService';

interface HomeBinderViewProps {
  items: InventoryItem[];
  open: (id: string) => void;
  edit: (id: string) => void;
  completeMaintenance: (item: InventoryItem, nextDueAt?: string) => void;
}

const dateLabel = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled';
const timing = (days: number) => days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;

export function HomeBinderView({ items, open, edit, completeMaintenance }: HomeBinderViewProps) {
  const maintenance = maintenanceEntries(items);
  const warranties = expiringWarranties(items);
  const withDocuments = items.filter(item => !item.archivedAt && binderDocumentCount(item) > 0).sort((a, b) => binderDocumentCount(b) - binderDocumentCount(a));
  const overdue = maintenance.filter(entry => entry.state === 'overdue').length;
  const dueSoon = maintenance.filter(entry => entry.state === 'due-soon').length;
  return <>
    <header className="binderHead"><p className="eyebrow green">HOME BINDER</p><h1>Keep the useful household details in one place.</h1><p className="sub">Track maintenance, warranties, manuals, and purchase proof alongside the item itself.</p></header>
    <section className="binderStats" aria-label="Home Binder summary">
      <div><Wrench /><span><b>{overdue}</b><small>overdue task{overdue === 1 ? '' : 's'}</small></span></div>
      <div><ShieldCheck /><span><b>{dueSoon}</b><small>due in 30 days</small></span></div>
      <div><FileText /><span><b>{withDocuments.length}</b><small>items with documents</small></span></div>
    </section>
    <section className="panel binderPanel">
      <div className="sectionTitle"><div><p className="eyebrow green">MAINTENANCE</p><h2>What needs attention</h2></div></div>
      {maintenance.length ? <div className="binderList">{maintenance.map(({ item, daysUntil, state }) => {
        const nextDue = item.maintenanceCadenceMonths ? nextMaintenanceDate(item.maintenanceDueAt!, item.maintenanceCadenceMonths) : undefined;
        return <article className="binderRow" key={item.id}><div className={`binderIcon ${state}`}><Wrench /></div><div><button className="binderItemLink" onClick={() => open(item.id)}>{item.itemName}</button><p>{item.maintenanceTask} · {item.location}</p><small className={state}>{timing(daysUntil)} · {dateLabel(item.maintenanceDueAt)}</small></div><div className="binderActions"><button onClick={() => completeMaintenance(item, nextDue)}>Mark done</button><button className="textBtn" onClick={() => edit(item.id)}>Edit</button></div></article>;
      })}</div> : <div className="binderEmpty"><Wrench /><h3>No maintenance is scheduled.</h3><p>Open an item and add a task when you want a reminder here.</p></div>}
    </section>
    <section className="binderGrid">
      <section className="panel binderPanel"><div className="sectionTitle"><div><p className="eyebrow green">WARRANTIES</p><h2>Expiring soon</h2></div></div>{warranties.length ? <div className="binderList compact">{warranties.map(({ item, daysUntil }) => <article className="binderRow" key={item.id}><div className="binderIcon warranty"><ShieldCheck /></div><div><button className="binderItemLink" onClick={() => open(item.id)}>{item.itemName}</button><p>Expires {dateLabel(item.warrantyExpiresAt)}</p><small className={daysUntil < 0 ? 'overdue' : 'due-soon'}>{daysUntil < 0 ? `Expired ${Math.abs(daysUntil)} days ago` : `${daysUntil} days remaining`}</small></div><button className="textBtn" onClick={() => edit(item.id)}>Edit</button></article>)}</div> : <div className="binderEmpty compact"><ShieldCheck /><h3>Nothing expiring soon.</h3><p>Add a warranty date to an item to see it here.</p></div>}</section>
      <section className="panel binderPanel"><div className="sectionTitle"><div><p className="eyebrow green">DOCUMENTS</p><h2>Manuals & purchase proof</h2></div></div>{withDocuments.length ? <div className="binderList compact">{withDocuments.slice(0, 6).map(item => <article className="binderRow" key={item.id}><div className="binderIcon document"><ReceiptText /></div><div><button className="binderItemLink" onClick={() => open(item.id)}>{item.itemName}</button><p>{binderDocumentCount(item)} saved reference{binderDocumentCount(item) === 1 ? '' : 's'}</p>{item.manualUrl && <a href={item.manualUrl} target="_blank" rel="noreferrer">Open manual <ExternalLink /></a>}</div><button className="textBtn" onClick={() => edit(item.id)}>Edit</button></article>)}</div> : <div className="binderEmpty compact"><FileText /><h3>No household documents yet.</h3><p>Receipts, warranty files, and manual links will appear here.</p></div>}</section>
    </section>
  </>;
}
