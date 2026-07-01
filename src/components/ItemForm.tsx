import { ChangeEvent, FormEvent, useState } from 'react';
import { ArrowLeft, Camera, Save, X } from 'lucide-react';
import { InventoryItem, ItemCondition, ItemStatus } from '../types';
import { uid } from '../lib/utils';

interface ItemFormProps {
  item?: InventoryItem;
  onCancel: () => void;
  onSave: (item: InventoryItem) => void;
}

const emptyItem = (): InventoryItem => {
  const now = new Date().toISOString();
  return {
    id: uid('item'), itemName: '', category: 'Other', location: '', condition: 'unknown',
    comparableListings: [], photos: [], serialPhotos: [], markingPhotos: [], receiptFiles: [],
    appraisalFiles: [], warrantyFiles: [], status: 'normal', createdAt: now, updatedAt: now
  };
};

export function ItemForm({ item, onCancel, onSave }: ItemFormProps) {
  const [draft, setDraft] = useState<InventoryItem>(() => item ? {...item} : emptyItem());
  const [error, setError] = useState('');
  const set = <K extends keyof InventoryItem>(key: K, value: InventoryItem[K]) => setDraft(current => ({...current, [key]: value}));
  const text = (key: keyof InventoryItem) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, event.target.value as never);
  const number = (key: 'purchasePrice' | 'userEnteredValue') => (event: ChangeEvent<HTMLInputElement>) => set(key, event.target.value ? Number(event.target.value) : undefined);

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (draft.photos.length + files.length > 5) { setError('Add no more than five item photos.'); return; }
    if (files.some(file => file.size > 2_000_000)) { setError('Each photo must be smaller than 2 MB for browser storage.'); return; }
    const encoded = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
    })));
    if ([...draft.photos, ...encoded].reduce((total, photo) => total + photo.length, 0) > 3_500_000) {
      setError('These photos exceed the safe browser-storage limit. Use fewer or smaller images.'); return;
    }
    set('photos', [...draft.photos, ...encoded]); setError(''); event.target.value = '';
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.itemName.trim() || !draft.location.trim()) { setError('Item name and location are required.'); return; }
    onSave({...draft, itemName:draft.itemName.trim(), location:draft.location.trim(), updatedAt:new Date().toISOString()});
  };

  return <form className="itemForm" onSubmit={submit}>
    <button type="button" className="back" onClick={onCancel}><ArrowLeft/> Inventory</button>
    <header><p className="eyebrow green">{item ? 'EDIT ITEM' : 'NEW INVENTORY ITEM'}</p><h1>{item ? `Update ${item.itemName}` : 'Document an item'}</h1><p className="sub">Capture enough detail to identify, value, and recover it later.</p></header>
    {error && <div className="formError" role="alert">{error}</div>}
    <div className="formGrid">
      <section className="panel formSection"><h2>Item basics</h2><div className="fields two"><label>Item name <input required value={draft.itemName} onChange={text('itemName')} placeholder="Milwaukee M18 drill"/></label><label>Category <select value={draft.category} onChange={text('category')}><option>Tools</option><option>Electronics</option><option>Jewelry</option><option>Bicycles</option><option>Furniture</option><option>Collectibles</option><option>Other</option></select></label><label>Location <input required value={draft.location} onChange={text('location')} placeholder="Garage"/></label><label>Room / sub-location <input value={draft.room ?? ''} onChange={text('room')} placeholder="Tool cabinet"/></label><label>Condition <select value={draft.condition} onChange={e=>set('condition',e.target.value as ItemCondition)}><option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option><option value="unknown">Unknown</option></select></label><label>Status <select value={draft.status} onChange={e=>set('status',e.target.value as ItemStatus)}><option value="normal">Normal</option><option value="stolen">Stolen</option><option value="damaged">Damaged</option><option value="destroyed">Destroyed</option><option value="missing">Missing</option><option value="recovered">Recovered</option></select></label></div><label>Description <textarea value={draft.userDescription ?? ''} onChange={text('userDescription')} placeholder="What is it, what came with it, and how is it used?"/></label></section>
      <section className="panel formSection"><h2>Make & identifiers</h2><div className="fields two"><label>Manufacturer / make <input value={draft.make ?? ''} onChange={text('make')}/></label><label>Model <input value={draft.model ?? ''} onChange={text('model')}/></label><label>Serial number <input value={draft.serialNumber ?? ''} onChange={text('serialNumber')}/></label><label>Barcode <input value={draft.barcode ?? ''} onChange={text('barcode')}/></label></div><label>Distinguishing features <textarea value={draft.distinguishingFeatures ?? ''} onChange={text('distinguishingFeatures')} placeholder="Scratches, repairs, dents, modifications, or unique details"/></label></section>
      <section className="panel formSection"><h2>Owner-applied marking</h2><p className="helper">Examples: initials, engraving, paint mark, business sticker, QR tag, hidden marking, or distinct repair.</p><div className="fields two"><label>Marking text / description <input value={draft.ownerMarking ?? ''} onChange={text('ownerMarking')}/></label><label>Marking type <select value={draft.markingType ?? ''} onChange={text('markingType')}><option value="">None</option><option>initials</option><option>engraved</option><option>paint</option><option>marker</option><option>sticker</option><option>QR/asset tag</option><option>UV marker</option><option>custom number</option><option>other</option></select></label><label>Location on item <input value={draft.markingLocation ?? ''} onChange={text('markingLocation')}/></label></div></section>
      <section className="panel formSection"><h2>Value & notes</h2><div className="fields two"><label>Purchase price <input type="number" min="0" step="0.01" value={draft.purchasePrice ?? ''} onChange={number('purchasePrice')}/></label><label>User-entered replacement value <input type="number" min="0" step="0.01" value={draft.userEnteredValue ?? ''} onChange={number('userEnteredValue')}/></label></div><label>Notes <textarea value={draft.notes ?? ''} onChange={text('notes')}/></label></section>
    </div>
    <section className="panel formSection photoSection"><div><h2>Item photos</h2><p className="helper">Up to five photos, 2 MB each. Stored only in this browser.</p></div><label className="photoButton"><Camera/> Add photos<input type="file" accept="image/*" multiple onChange={addPhotos}/></label><div className="photoGrid">{draft.photos.map((photo,index)=><div className="photoPreview" key={`${photo.slice(0,24)}-${index}`}>{photo.startsWith('data:image')?<img src={photo} alt={`Item photo ${index+1}`}/>:<div><Camera/><span>Seed photo</span></div>}<button type="button" onClick={()=>set('photos',draft.photos.filter((_,i)=>i!==index))} aria-label={`Remove photo ${index+1}`}><X/></button></div>)}</div></section>
    <div className="formActions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary" type="submit"><Save/> Save item</button></div>
  </form>;
}
