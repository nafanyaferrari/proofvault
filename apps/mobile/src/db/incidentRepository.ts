import type { SQLiteDatabase } from 'expo-sqlite';
import { uid, type Incident, type IncidentDraft, type IncidentItem } from '@proofvault/domain';

type IncidentRow={id:string;title:string;type:string;incident_date:string;location_text:string;owner_name:string|null;owner_phone:string|null;owner_email:string|null;owner_address:string|null;police_agency:string|null;police_case_number:string|null;insurance_company:string|null;insurance_claim_number:string|null;notes:string|null;created_at:string};

export async function listIncidents(db:SQLiteDatabase):Promise<Incident[]>{
  const rows=await db.getAllAsync<IncidentRow>('SELECT id,title,type,incident_date,location_text,owner_name,owner_phone,owner_email,owner_address,police_agency,police_case_number,insurance_company,insurance_claim_number,notes,created_at FROM incidents ORDER BY incident_date DESC,created_at DESC');
  const incidents:Incident[]=[];
  for(const row of rows){const items=await db.getAllAsync<{item_id:string;status:IncidentItem['status'];notes:string|null}>('SELECT item_id,status,notes FROM incident_items WHERE incident_id=?',row.id);const hydratedItems:IncidentItem[]=[];for(const item of items){const photos=await db.getAllAsync<{local_uri:string}>('SELECT local_uri FROM incident_attachments WHERE incident_id=? AND item_id=? ORDER BY created_at',row.id,item.item_id);hydratedItems.push({itemId:item.item_id,status:item.status,notes:item.notes??undefined,photos:photos.map(photo=>photo.local_uri)});}incidents.push({id:row.id,title:row.title,type:row.type,incidentDate:row.incident_date,location:row.location_text,ownerName:row.owner_name??undefined,ownerPhone:row.owner_phone??undefined,ownerEmail:row.owner_email??undefined,ownerAddress:row.owner_address??undefined,policeAgency:row.police_agency??undefined,policeCaseNumber:row.police_case_number??undefined,insuranceCompany:row.insurance_company??undefined,insuranceClaimNumber:row.insurance_claim_number??undefined,notes:row.notes??undefined,createdAt:row.created_at,items:hydratedItems});}
  return incidents;
}

export async function saveIncidentRecord(db:SQLiteDatabase,draft:IncidentDraft,incidentId?:string){
  const id=incidentId??uid('incident');const now=new Date().toISOString();
  await db.withTransactionAsync(async()=>{
    if(incidentId){
      await db.runAsync('UPDATE incidents SET title=?,type=?,incident_date=?,location_text=?,owner_name=?,owner_phone=?,owner_email=?,owner_address=?,police_agency=?,police_case_number=?,insurance_company=?,insurance_claim_number=?,notes=?,updated_at=? WHERE id=?',draft.title.trim(),draft.type,draft.incidentDate,draft.location.trim(),draft.ownerName.trim()||null,draft.ownerPhone.trim()||null,draft.ownerEmail.trim()||null,draft.ownerAddress.trim()||null,draft.policeAgency.trim()||null,draft.policeCaseNumber.trim()||null,draft.insuranceCompany.trim()||null,draft.insuranceClaimNumber.trim()||null,draft.notes.trim()||null,now,id);
      const existing=await db.getAllAsync<{item_id:string}>('SELECT item_id FROM incident_items WHERE incident_id=?',id);
      for(const item of existing)if(!draft.items.some(candidate=>candidate.itemId===item.item_id))await db.runAsync('DELETE FROM incident_items WHERE incident_id=? AND item_id=?',id,item.item_id);
    }else{
      await db.runAsync('INSERT INTO incidents(id,title,type,incident_date,location_text,owner_name,owner_phone,owner_email,owner_address,police_agency,police_case_number,insurance_company,insurance_claim_number,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,draft.title.trim(),draft.type,draft.incidentDate,draft.location.trim(),draft.ownerName.trim()||null,draft.ownerPhone.trim()||null,draft.ownerEmail.trim()||null,draft.ownerAddress.trim()||null,draft.policeAgency.trim()||null,draft.policeCaseNumber.trim()||null,draft.insuranceCompany.trim()||null,draft.insuranceClaimNumber.trim()||null,draft.notes.trim()||null,now,now);
    }
    for(const item of draft.items)await db.runAsync('INSERT INTO incident_items(incident_id,item_id,status,notes) VALUES (?,?,?,?) ON CONFLICT(incident_id,item_id) DO UPDATE SET status=excluded.status,notes=excluded.notes',id,item.itemId,item.status,item.notes??null);
  });
  return id;
}

export async function deleteIncidentRecord(db:SQLiteDatabase,incidentId:string){await db.runAsync('DELETE FROM incidents WHERE id=?',incidentId);}
export async function saveIncidentPhoto(db:SQLiteDatabase,incidentId:string,itemId:string,uri:string,mimeType?:string,originalName?:string){await db.runAsync('INSERT INTO incident_attachments(id,incident_id,item_id,local_uri,mime_type,original_name,created_at) VALUES (?,?,?,?,?,?,?)',uid('incident_photo'),incidentId,itemId,uri,mimeType??null,originalName??null,new Date().toISOString());}
