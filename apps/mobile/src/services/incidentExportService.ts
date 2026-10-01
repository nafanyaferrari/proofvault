import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { incidentTextPacket, type Incident, type InventoryItem, type SubscriptionTier } from '@proofvault/domain';

export async function shareIncidentPacket(incident:Incident,items:InventoryItem[],tier:SubscriptionTier){
  if(!await Sharing.isAvailableAsync())throw new Error('Sharing is not available on this device.');
  const safeTitle=incident.title.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50)||'incident';
  const file=new File(Paths.cache,`AssetVault_${safeTitle}_${Date.now()}.txt`);
  file.create();file.write(incidentTextPacket(incident,items,tier));
  await Sharing.shareAsync(file.uri,{mimeType:'text/plain',dialogTitle:'Share AssetVault incident packet',UTI:'public.plain-text'});
}
