import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, ChevronRight, Cloud, ExternalLink, FileText, Home, LockKeyhole, MapPin, Package, Pencil, Plus, Search, Settings, ShieldCheck, Sparkles, Tag, TriangleAlert, Wrench, CircleGauge } from 'lucide-react';
import { clearBulkDrafts, loadBatchDefaults, loadBulkDrafts, loadIncidents, loadItems, loadLocations, loadPremiumAiAssistUsage, loadTier, loadTrialPhotoUses, premiumAiAssistLimit, PremiumAiAssistUsage, replaceLocalData, saveBatchDefaults, saveBulkDrafts, saveItems, saveLocations, savePremiumAiAssistUsage, saveTier, saveTrialPhotoUses, seedIncident, seedItems, seedLocations, trialPhotoLimit } from './data';
import { InventoryItem, LocationRecord, SubscriptionTier, ValuationResult } from './types';
import { completenessScore } from './services/completeness';
import { VALUATION_DISCLAIMER, valuationService } from './services/valuationService';
import { dateTime, money, uid } from './lib/utils';
import { ItemForm } from './components/ItemForm';
import { IncidentManager } from './components/IncidentManager';
import { BackupPanel } from './components/BackupPanel';
import { AssetVaultBackup } from './services/backupService';
import { LocationsManager } from './components/LocationsManager';
import { PrivacySecurityPanel } from './components/PrivacySecurityPanel';
import { AboutPanel } from './components/AboutPanel';
import { itemIntakeService } from './services/itemIntakeService';
import { itemReviewBacklog, itemReviewFlags } from './services/itemReview';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { CloudSnapshot, CloudStatus, cloudPersistenceService } from './services/cloudPersistenceService';
import { AccountGate } from './components/AccountGate';
import { analysisQueueService, analysisStorageReference, AnalysisJob } from './services/analysisQueueService';
import { evidenceStorageService, isSupabaseStorageReference } from './services/evidenceStorageService';
import { HomeBinderView } from './components/HomeBinderView';
import { nextMaintenanceDate } from './services/homeBinderService';
import { CoverageCenterView } from './components/CoverageCenterView';
import { HouseholdAccessPanel } from './components/HouseholdAccessPanel';
import { filterInventoryItems, type InventoryFilters } from '../packages/domain/src/inventorySearch';
import { assetVaultPlans, loadMockPlan, planAccess, planForId, saveMockPlan, type AssetVaultPlan } from './productPlans';
import { clearActivation, loadActivation, proofReadiness, saveActivation, trackActivationEvent, type AssetVaultActivation } from './services/activationService';
import { ProofCheckOnboarding } from './components/ProofCheckOnboarding';
import { PartnerReferralPanel } from './components/PartnerReferralPanel';

type View = 'home' | 'inventory' | 'binder' | 'coverage' | 'bulkReview' | 'detail' | 'form' | 'locations' | 'incident' | 'settings' | 'onboarding';
const emptyAccountLocations:LocationRecord[]=[{id:'loc-home',name:'Home',notes:'Default location for your first items',createdAt:new Date().toISOString()}];
const waitlistOnlyLaunch = import.meta.env.VITE_PROOFVAULT_LAUNCH_MODE === 'waitlist';
const maxBulkPhotosPerBatch = 12;
let queuePresentation:{jobs:AnalysisJob[];pendingDrafts:number;resumeReview:()=>void;signedIn:boolean;canUseAiPhoto?:boolean;startItemPhotos?:(files:File[])=>void;retryFailed?:(jobId:string)=>void;retryingJobId?:string|null}={jobs:[],pendingDrafts:0,resumeReview:()=>undefined,signedIn:false};

export function App() {
  const [view, setView] = useState<View>('home');
  const [items, setItems] = useState<InventoryItem[]>(loadItems);
  const [tier, setTierState] = useState<SubscriptionTier>(loadTier);
  const [selectedPlan, setSelectedPlan] = useState<AssetVaultPlan>(() => loadMockPlan(loadTier()));
  const [activation, setActivation] = useState<AssetVaultActivation>(loadActivation);
  const [sharePrompt, setSharePrompt] = useState<string>();
  const [selectedId, setSelectedId] = useState('drill');
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState('');
  const [quickSerial, setQuickSerial] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [locations, setLocations] = useState<LocationRecord[]>(loadLocations);
  const [assistedDraft, setAssistedDraft] = useState<InventoryItem>();
  const [assistedWarnings, setAssistedWarnings] = useState<string[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [bulkDrafts, setBulkDrafts] = useState<InventoryItem[]>(loadBulkDrafts);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportMessage, setBulkImportMessage] = useState('');
  const [queuedAnalysisCount, setQueuedAnalysisCount] = useState(0);
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([]);
  const [retryingAnalysisJobId, setRetryingAnalysisJobId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ configured: cloudPersistenceService.isConfigured(), authenticated: false });
  const [localDemoAllowed, setLocalDemoAllowed] = useState(() => localStorage.getItem('pv-account-mode') === 'local');
  const [trialScope, setTrialScope] = useState('local');
  const [trialPhotoUses, setTrialPhotoUses] = useState(() => loadTrialPhotoUses('local'));
  const [premiumAiUsage, setPremiumAiUsage] = useState<PremiumAiAssistUsage>(() => loadPremiumAiAssistUsage('local'));
  const [cloudReadyToSync, setCloudReadyToSync] = useState(false);
  const [syncRevision, setSyncRevision] = useState(0);
  const [cloudSyncState, setCloudSyncState] = useState<'idle'|'loading'|'saving'|'saved'|'error'>('idle');
  const [cloudSyncMessage, setCloudSyncMessage] = useState('');
  const skipNextCloudAutosave = useRef(false);
  const adoptingQueuedJobs = useRef(false);
  const recoveredAcknowledgedJobs = useRef(false);
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const trialPhotosRemaining = Math.max(0, trialPhotoLimit - trialPhotoUses);
  const premiumAiAssistsRemaining = Math.max(0, premiumAiAssistLimit - premiumAiUsage.uses);
  const canUseAiPhoto = tier === 'premium' ? premiumAiAssistsRemaining > 0 : trialPhotosRemaining > 0;
  queuePresentation={jobs:analysisJobs,pendingDrafts:bulkDrafts.length,resumeReview:()=>setView('bulkReview'),signedIn:cloudStatus.authenticated};
  useEffect(()=>{setManual('');setQuickSerial('');},[selectedId]);
  const markLocalChange = () => setSyncRevision(value => value + 1);
  const hydrateCloudAccount = async () => {
    localStorage.removeItem('pv-account-mode');
    setLocalDemoAllowed(false);
    setCloudReadyToSync(false);
    setCloudSyncState('loading');
    setCloudSyncMessage('Loading your cloud account...');
    try {
      const status = await cloudPersistenceService.status();
      const nextTrialScope = status.userId ? `account:${status.userId}` : 'account';
      setTrialScope(nextTrialScope);
      setTrialPhotoUses(loadTrialPhotoUses(nextTrialScope));
      setPremiumAiUsage(loadPremiumAiAssistUsage(nextTrialScope));
      const snapshot = await cloudPersistenceService.loadSnapshot();
      skipNextCloudAutosave.current = true;
      if (!restoreCloudSnapshot(snapshot)) throw new Error('Cloud data could not be loaded into this browser.');
      setView(loadActivation().primaryUseCase ? 'inventory' : 'onboarding');
      setCloudSyncState('saved');
      setCloudSyncMessage(snapshot.items.length ? `Loaded ${snapshot.items.length} cloud item${snapshot.items.length===1?'':'s'}. Autosave is on.` : 'Cloud account ready. Autosave is on.');
      setCloudReadyToSync(true);
    } catch (error) {
      clearBulkDrafts();
      setBulkDrafts([]);
      setItems([]);
      setLocations(emptyAccountLocations);
      setTierState('free');
      setSelectedPlan('proof-check');
      setSelectedId('');
      setView('home');
      setCloudSyncState('error');
      setCloudSyncMessage(error instanceof Error ? error.message : 'Cloud account could not be loaded.');
      setNotice('Signed in, but cloud data could not be loaded. Changes are not autosaving yet.');
    }
  };
  useEffect(() => {
    let active = true;
    cloudPersistenceService.status().then(status => { if (!active) return; setCloudStatus(status); if (status.authenticated) void hydrateCloudAccount(); }).catch(() => undefined);
    const unsubscribe = cloudPersistenceService.subscribeToAuthChanges(status => {
      setCloudStatus(status);
      if (status.authenticated) {
        void hydrateCloudAccount();
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!cloudStatus.authenticated || !cloudReadyToSync) return;
    if (skipNextCloudAutosave.current) { skipNextCloudAutosave.current = false; return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setCloudSyncState('saving');
      setCloudSyncMessage('Autosaving to your account...');
      cloudPersistenceService.saveSnapshot({items,incidents:loadIncidents(false),locations,tier,batchDefaults:loadBatchDefaults()})
        .then(() => {
          if (cancelled) return;
          setCloudSyncState('saved');
          setCloudSyncMessage(`Autosaved ${items.length} item${items.length===1?'':'s'} to your account.`);
        })
        .catch(error => {
          if (cancelled) return;
          setCloudSyncState('error');
          setCloudSyncMessage(error instanceof Error ? error.message : 'Autosave failed.');
        });
    }, 900);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [items,locations,tier,syncRevision,cloudStatus.authenticated,cloudReadyToSync]);
  const storageFullNotice = 'Browser storage is full, so this change was not saved. Export a backup, remove large attachments, or continue in the mobile app for larger evidence sets.';
  const persistItems = (nextItems: InventoryItem[]) => { try { saveItems(nextItems); return true; } catch { setNotice(storageFullNotice); return false; } };
  const update = (next: InventoryItem) => { const all = items.map(i => i.id === next.id ? next : i); if(!persistItems(all)) return false; setItems(all); markLocalChange(); return true; };
  const completeMaintenance = (item: InventoryItem, suggestedNextDueAt?: string) => {
    const completedAt = new Date().toISOString();
    const nextDueAt = suggestedNextDueAt ?? (item.maintenanceCadenceMonths && item.maintenanceCadenceMonths > 0 ? nextMaintenanceDate(item.maintenanceDueAt ?? completedAt.slice(0, 10), item.maintenanceCadenceMonths) : undefined);
    if (update({ ...item, maintenanceLastCompletedAt: completedAt, maintenanceDueAt: nextDueAt, updatedAt: completedAt })) setNotice(nextDueAt ? `Maintenance complete. Next due ${new Date(`${nextDueAt}T12:00:00`).toLocaleDateString()}.` : 'Maintenance marked complete.');
  };
  const setTier = (next: SubscriptionTier) => setPlan(next === 'premium' ? 'complete' : 'proof-check');
  const setPlan = (plan: AssetVaultPlan) => { try { const next = planAccess(plan); saveTier(next); saveMockPlan(plan); setSelectedPlan(plan); setTierState(next); markLocalChange(); setNotice(`${planForId(plan).name} preview enabled. No payment is collected in this prototype.`); } catch { setNotice('Could not save the prototype access setting in this browser.'); } };
  const restoreBackup = (backup: AssetVaultBackup) => { try { replaceLocalData(backup.items,backup.incidents,backup.locations,backup.settings.subscriptionTier,backup.settings.batchDefaults); } catch { setNotice('Could not restore the backup because browser storage is full. Existing browser data was kept.'); return false; } setBulkDrafts([]); setItems(backup.items); setLocations(backup.locations); setTierState(backup.settings.subscriptionTier); setSelectedPlan(backup.settings.subscriptionTier === 'premium' ? 'complete' : 'proof-check'); setSelectedId(backup.items[0]?.id ?? ''); markLocalChange(); setNotice(cloudStatus.authenticated?'Backup restored. Autosave will update your account.':'Local backup restored.'); return true; };
  const restoreCloudSnapshot = (snapshot: CloudSnapshot) => { const pendingDrafts=loadBulkDrafts(); try { replaceLocalData(snapshot.items,snapshot.incidents,snapshot.locations,snapshot.tier,snapshot.batchDefaults,true); } catch { setNotice('Could not restore cloud data because browser storage is full. Existing browser data was kept.'); return false; } setBulkDrafts(pendingDrafts); setItems(snapshot.items); setLocations(snapshot.locations.length?snapshot.locations:emptyAccountLocations); setTierState(snapshot.tier); setSelectedPlan(snapshot.tier === 'premium' ? 'complete' : 'proof-check'); setSelectedId(snapshot.items[0]?.id ?? ''); setNotice(snapshot.items.length?'Cloud data loaded into this browser.':'Cloud account is empty. Start by adding your first item.'); return true; };
  const updateLocations = (next: LocationRecord[]) => { if(tier==='free' && next.length>1){setNotice('Protect more than one location with AssetVault Complete. Add homes, storage, trailers, jobsites, and more from one proof record.');trackActivationEvent('upgrade_prompt_viewed',{reason:'multiple_locations'});return;} try { saveLocations(next); setLocations(next); markLocalChange(); setNotice('Locations updated.'); } catch { setNotice('Could not save locations in this browser.'); } };
  const resetDemoData = () => { if(cloudStatus.authenticated){setNotice('Demo reset is only available in local demo mode so sample data is not saved to your account.');return;} const freshPremiumUsage={cycleStartedAt:new Date().toISOString(),uses:0}; try { replaceLocalData(seedItems,[seedIncident],seedLocations,'free',{location:'',room:''}); saveTrialPhotoUses('local',0); savePremiumAiAssistUsage('local',freshPremiumUsage); } catch { setNotice('Could not reset demo data in this browser. Existing browser data was kept.'); return; } clearActivation(); setActivation({}); saveMockPlan('proof-check'); setTrialScope('local'); setTrialPhotoUses(0); setPremiumAiUsage(freshPremiumUsage); setBulkDrafts([]); setItems(seedItems); setLocations(seedLocations); setTierState('free'); setSelectedPlan('proof-check'); setSelectedId(seedItems[0]?.id ?? ''); setAssistedDraft(undefined); setAssistedWarnings([]); setEditingId(undefined); setView('onboarding'); setNotice('Demo data reset. Start the Proof Check to see your readiness path.'); };
  const continueLocalDemo = () => { const freshPremiumUsage={cycleStartedAt:new Date().toISOString(),uses:0}; try { replaceLocalData(seedItems,[seedIncident],seedLocations,'free',{location:'',room:''}); saveTrialPhotoUses('local',0); savePremiumAiAssistUsage('local',freshPremiumUsage); } catch { setNotice('Could not prepare a separate local demo because browser storage is full.'); return; } clearActivation(); setActivation({}); localStorage.setItem('pv-account-mode','local'); setTrialScope('local'); setTrialPhotoUses(0); setPremiumAiUsage(freshPremiumUsage); setBulkDrafts([]); setItems(seedItems); setLocations(seedLocations); setTierState('free'); setSelectedPlan('proof-check'); setSelectedId(seedItems[0]?.id ?? ''); setAssistedDraft(undefined); setAssistedWarnings([]); setEditingId(undefined); setView('onboarding'); setLocalDemoAllowed(true); setNotice('Fresh local demo opened. Start with the Proof Check, then use the Top 10 Assets Challenge.'); };
  const updateActivation = (patch: Partial<AssetVaultActivation>) => { const next={...activation,...patch}; saveActivation(next); setActivation(next); if(patch.primaryUseCase)trackActivationEvent('use_case_selected',{useCase:patch.primaryUseCase}); if(patch.primaryConcern)trackActivationEvent('concern_selected',{concern:patch.primaryConcern}); if(patch.referralCode)trackActivationEvent('partner_referral_code_entered'); };
  const startProofCheck = () => { const next={...activation,proofCheckStartedAt:new Date().toISOString()}; saveActivation(next); setActivation(next); trackActivationEvent('proof_check_started'); setView('home'); };
  const open = (id: string) => { setSelectedId(id); setView('detail'); };
  const startNew = () => { setEditingId(undefined); setAssistedDraft(undefined); setAssistedWarnings([]); setView('form'); };
  const startEdit = (id: string) => { setEditingId(id); setAssistedDraft(undefined); setAssistedWarnings([]); setView('form'); };
  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Photo could not be read.'));
    reader.onerror = () => reject(new Error('Photo could not be read.'));
    reader.readAsDataURL(file);
  });
  const optimizedPhotoDataUrl = async (file: File) => {
    if (!file.type.startsWith('image/')) return readFileAsDataUrl(file);
    const original = await readFileAsDataUrl(file);
    return new Promise<string>(resolve => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimized = canvas.toDataURL('image/jpeg', 0.72);
        resolve(optimized.length < original.length ? optimized : original);
      };
      image.onerror = () => resolve(original);
      image.src = original;
    });
  };
  const applyValuation = (item: InventoryItem, valuation?: ValuationResult): InventoryItem => valuation ? {
    ...item,
    estimatedReplacementValueLow: valuation.estimatedReplacementValueLow,
    estimatedReplacementValueHigh: valuation.estimatedReplacementValueHigh,
    estimatedReplacementValueSelected: valuation.suggestedReplacementValue,
    valuationCurrency: 'USD',
    valuationConfidence: valuation.confidence,
    valuationSourceSummary: valuation.sourceSummary,
    valuationCheckedAt: new Date().toISOString(),
    valuationNotes: item.valuationNotes ? `${item.valuationNotes} Replacement estimate created from photo-first intake mock analysis.` : 'Created from photo-first intake mock analysis.',
    comparableListings: valuation.comparableListings
  } : item;
  const draftFromIntakeResult = (result: Awaited<ReturnType<typeof itemIntakeService.analyze>>, photo: string|string[], sourceDraft=result.draft, valuation=sourceDraft===result.draft?result.valuation:undefined): InventoryItem => {
    const now = new Date().toISOString();
    const photos=Array.isArray(photo)?photo:[photo];
    return applyValuation({
      ...sourceDraft,
      id: uid('item'),
      photos: photos.slice(0,1),
      serialPhotos: photos.slice(1),
      markingPhotos: [],
      receiptFiles: [],
      appraisalFiles: [],
      warrantyFiles: [],
      damagePhotos: [],
      otherFiles: [],
      comparableListings: [],
      aiSuggestedTitle: sourceDraft.itemName || result.suggestedTitle,
      aiDescription: result.suggestedDescription,
      valuationNotes: result.needsSerialVerification ? 'Photo-prefilled draft. Serial number requires user verification.' : undefined,
      createdAt: now,
      updatedAt: now
    }, valuation);
  };
  const draftsFromIntakeResult = (result: Awaited<ReturnType<typeof itemIntakeService.analyze>>, photos: string[]) => {
    const candidates=result.candidates?.length?result.candidates:[result.draft];
    return candidates.map(candidate=>draftFromIntakeResult(result,photos,candidate));
  };
  const draftFromQueuedJob = (job: AnalysisJob) => {
    const response = job.result as { draft?: InventoryItem; candidates?: InventoryItem[]; suggestedTitle?: string; suggestedDescription?: string; fields?: Record<string, { confidence?: 'low'|'medium'|'high' } | undefined>; warnings?: string[]; needsSerialVerification?: boolean; providersUsed?: string[]; valuation?: ValuationResult } | undefined;
    if (!response?.draft) return;
    const result={
      draft: response.draft as Awaited<ReturnType<typeof itemIntakeService.analyze>>['draft'],
      suggestedTitle: response.suggestedTitle || response.draft.itemName,
      suggestedDescription: response.suggestedDescription || response.draft.userDescription || '',
      fieldConfidence: {
        make: response.fields?.make?.confidence || 'low',
        model: response.fields?.model?.confidence || 'low',
        serialNumber: response.fields?.serialNumber?.confidence || 'low'
      },
      needsSerialVerification: Boolean(response.needsSerialVerification),
      provider: (response.providersUsed?.includes('mock') ? 'mock' : 'secure-backend') as 'mock'|'secure-backend',
      warnings: response.warnings,
      valuation: response.valuation,
      candidates: response.candidates as Awaited<ReturnType<typeof itemIntakeService.analyze>>['candidates']
    };
    const photoPaths=job.storage_paths?.length?job.storage_paths:[job.storage_path];
    return draftsFromIntakeResult(result,photoPaths.map(analysisStorageReference));
  };
  useEffect(() => {
    if (!cloudStatus.authenticated || !cloudReadyToSync || !analysisQueueService.isAvailable()) {
      setQueuedAnalysisCount(0);
      setAnalysisJobs([]);
      return;
    }
    let active = true;
    const refreshQueuedJobs = async () => {
      if (adoptingQueuedJobs.current) return;
      try {
        // A signed-in browser starts eligible jobs immediately. A scheduler can
        // continue the same work after the browser closes.
        await analysisQueueService.kick().catch(() => undefined);
        const awaitingJobs = await analysisQueueService.loadAwaitingReview();
        const recentAcknowledged = await analysisQueueService.loadRecentlyAcknowledged(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        const jobs = [...awaitingJobs, ...recentAcknowledged.filter(job => !awaitingJobs.some(current => current.id === job.id))];
        if (!active) return;
        setAnalysisJobs(jobs);
        setQueuedAnalysisCount(jobs.filter(job => ['queued', 'processing', 'retrying'].includes(job.status)).length);
        const completed = jobs.filter(job => job.status === 'complete' && job.result);
        const drafts = completed.flatMap(job=>draftFromQueuedJob(job)??[]);
        let recoveredDrafts: InventoryItem[] = [];
        if (!recoveredAcknowledgedJobs.current) {
          recoveredAcknowledgedJobs.current = true;
          const existingPhotoRefs = new Set([...items, ...loadBulkDrafts()].flatMap(item => item.photos).filter(isSupabaseStorageReference));
          recoveredDrafts = recentAcknowledged
            .filter(job => (job.storage_paths?.length ? job.storage_paths : [job.storage_path]).every(path => !existingPhotoRefs.has(analysisStorageReference(path))))
            .flatMap(job => draftFromQueuedJob(job) ?? []);
        }
        if (!drafts.length && !recoveredDrafts.length) return;
        adoptingQueuedJobs.current = true;
        try {
          const next = [...loadBulkDrafts(), ...drafts, ...recoveredDrafts];
          saveBulkDrafts(next);
          await Promise.all(completed.map(job => analysisQueueService.acknowledge(job.id)));
          if (!active) return;
          if (tier === 'free') {
            const uses = loadTrialPhotoUses(trialScope);
            const nextUses = Math.min(trialPhotoLimit, uses + drafts.length);
            saveTrialPhotoUses(trialScope, nextUses);
            setTrialPhotoUses(nextUses);
          } else {
            const usage = loadPremiumAiAssistUsage(trialScope);
            const nextUsage = { ...usage, uses: Math.min(premiumAiAssistLimit, usage.uses + drafts.length) };
            savePremiumAiAssistUsage(trialScope, nextUsage);
            setPremiumAiUsage(nextUsage);
          }
          setBulkDrafts(next);
          // A completed saved-photo job should lead straight to the short
          // review flow; users should never need to refresh or hunt for it.
          setView('bulkReview');
          const recoveredNote=recoveredDrafts.length?` ${recoveredDrafts.length} recently completed draft${recoveredDrafts.length===1?' was':'s were'} restored.`:'';
          setNotice(`${drafts.length} saved photo analysis${drafts.length===1?' is':'es are'} ready for review.${recoveredNote}`);
        } finally {
          adoptingQueuedJobs.current = false;
        }
      } catch {
        // Jobs remain in Supabase and will be retried on the next app visit or by the scheduler.
      }
    };
    void refreshQueuedJobs();
    const interval = window.setInterval(() => void refreshQueuedJobs(), 12_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [cloudStatus.authenticated, cloudReadyToSync, tier, trialScope]);
  const queueDurablePhoto = async (photos: string[], defaultLocation?: string, defaultRoom?: string) => {
    const queued = await analysisQueueService.enqueue(photos, { location: defaultLocation || locations[0]?.name || 'Home', room: defaultRoom }, true);
    setQueuedAnalysisCount(count => count + 1);
    void analysisQueueService.kick().catch(() => undefined);
    return queued;
  };
  const retryFailedAnalysis = async (jobId: string) => {
    setRetryingAnalysisJobId(jobId);
    try {
      await analysisQueueService.retry(jobId);
      const jobs = await analysisQueueService.loadAwaitingReview();
      setAnalysisJobs(jobs);
      setQueuedAnalysisCount(jobs.filter(job => ['queued', 'processing', 'retrying'].includes(job.status)).length);
      setNotice('Saved photo analysis restarted. It will update here when the draft is ready.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The saved photo could not be retried yet.');
    } finally {
      setRetryingAnalysisJobId(null);
    }
  };
  queuePresentation.retryFailed=retryFailedAnalysis;
  queuePresentation.retryingJobId=retryingAnalysisJobId;
  const recordTrialPhotoUse = (nextUses: number) => {
    try {
      saveTrialPhotoUses(trialScope, nextUses);
      setTrialPhotoUses(nextUses);
      return true;
    } catch {
      setNotice('Browser storage is full, so this photo analysis count could not be saved.');
      return false;
    }
  };
  const recordPremiumAiAssist = (nextUses: number) => {
    const nextUsage={...premiumAiUsage,uses:nextUses};
    try {
      savePremiumAiAssistUsage(trialScope,nextUsage);
      setPremiumAiUsage(nextUsage);
      return true;
    } catch {
      setNotice('Browser storage is full, so this photo analysis count could not be saved.');
      return false;
    }
  };
  const quickPhotoIntake = async (files: File|File[], defaultLocation?: string, defaultRoom?: string) => {
    const selectedFiles=(Array.isArray(files)?files:[files]).slice(0,4);
    if (!selectedFiles.length) return;
    if (!canUseAiPhoto) {
      setNotice(tier==='premium'?`Your ${premiumAiAssistLimit} annual Premium photo analyses are used. Add more analyses when billing is enabled, or add an item and value manually.`:'Your three Try Before You Buy photo analyses have been used. Enable AssetVault Complete preview for more photo analysis, or add an item and value manually.');
      return;
    }
    setIntakeLoading(true);
    try {
      const photos = await Promise.all(selectedFiles.map(optimizedPhotoDataUrl));
      if (cloudStatus.authenticated && analysisQueueService.isAvailable()) {
        await queueDurablePhoto(photos, defaultLocation, defaultRoom);
        setNotice(`Photo set saved safely. AssetVault is analyzing the overview and ${photos.length-1||'no'} close-up${photos.length===2?'':'s'} in the background; you can keep using the app or close it.`);
        return;
      }
      const result = await itemIntakeService.analyze({ photoUri: photos[0], photos, location: defaultLocation || locations[0]?.name || 'Home', room: defaultRoom }, true);
      const drafts = draftsFromIntakeResult(result, photos);
      if (tier === 'free' && !recordTrialPhotoUse(trialPhotoUses + 1)) return;
      if (tier === 'premium' && !recordPremiumAiAssist(premiumAiUsage.uses + 1)) return;
      if (drafts.length > 1) {
        saveBulkDrafts([...loadBulkDrafts(), ...drafts]);
        setBulkDrafts(current=>[...current,...drafts]);
        setView('bulkReview');
        setNotice(`AssetVault found ${drafts.length} possible items. Choose which records to save; one photo analysis was used.`);
        return;
      }
      setEditingId(undefined);
      setAssistedDraft(drafts[0]);
      setAssistedWarnings(result.warnings ?? []);
      setView('form');
      setNotice(tier === 'free' ? `Try Before You Buy analysis complete. ${Math.max(0, trialPhotosRemaining - 1)} of ${trialPhotoLimit} free photo analyses remain.` : `Photo intake created a draft. ${Math.max(0,premiumAiAssistsRemaining-1)} of ${premiumAiAssistLimit} annual Premium photo analyses remain.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Photo intake could not create a draft.');
    } finally {
      setIntakeLoading(false);
    }
  };
  const bulkPhotoIntake = async (files: File[], defaultLocation?: string, defaultRoom?: string) => {
    if (!files.length) return;
    if (!canUseAiPhoto) {
      setNotice(tier==='premium'?`Your ${premiumAiAssistLimit} annual Premium photo analyses are used. Add more analyses when billing is enabled, or add items and values manually.`:'Your three Try Before You Buy photo analyses have been used. Enable AssetVault Complete preview for more photo analysis, or add items and values manually.');
      return;
    }
    if (bulkDrafts.length) {
      setNotice(`You have ${bulkDrafts.length} saved photo draft${bulkDrafts.length===1?'':'s'} waiting. Resume or save that batch before starting another.`);
      setView('bulkReview');
      return;
    }
    const permittedPhotos = Math.min(maxBulkPhotosPerBatch,tier === 'premium' ? premiumAiAssistsRemaining : trialPhotosRemaining);
    const selectedFiles = files.slice(0, permittedPhotos);
    const leftForNextBatch = files.length - selectedFiles.length;
    setBulkImportLoading(true);
    setBulkImportMessage(`Preparing ${selectedFiles.length} item photo${selectedFiles.length===1?'':'s'}...`);
    const drafts: InventoryItem[] = [];
    let unreadablePhotos = 0;
    let unavailableAnalyses = 0;
    let durableQueued = 0;
    let storageStopped = false;
    let trialUsesDuringImport = trialPhotoUses;
    let premiumUsesDuringImport = premiumAiUsage.uses;
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        setBulkImportMessage(`Analyzing photo ${index + 1} of ${selectedFiles.length}...`);
        try {
          const photo = await optimizedPhotoDataUrl(file);
          if (cloudStatus.authenticated && analysisQueueService.isAvailable()) {
            await queueDurablePhoto([photo], defaultLocation, defaultRoom);
            durableQueued += 1;
            continue;
          }
          let draft: InventoryItem;
          let analyzed = false;
          try {
            const result = await itemIntakeService.analyze({ photoUri: photo, location: defaultLocation || locations[0]?.name || 'Home', room: defaultRoom }, true);
            draft = draftFromIntakeResult(result, photo);
            analyzed = true;
          } catch {
            unavailableAnalyses += 1;
            const now = new Date().toISOString();
            draft = {
              id: uid('item'),
              itemName: `Photo draft ${index + 1}`,
              category: 'Other',
              location: defaultLocation || locations[0]?.name || 'Home',
              room: defaultRoom,
              condition: 'unknown',
              photos: [photo],
              serialPhotos: [],
              markingPhotos: [],
              receiptFiles: [],
              appraisalFiles: [],
              warrantyFiles: [],
              damagePhotos: [],
              otherFiles: [],
              comparableListings: [],
              notes: 'This photo could not be analyzed. No photo analysis was used. Review and fill in make, model, serial number, and value before relying on this record.',
              status: 'normal',
              createdAt: now,
              updatedAt: now
            };
          }
          const nextDrafts = [...drafts, draft];
          try {
            saveBulkDrafts(nextDrafts);
          } catch {
            storageStopped = true;
            break;
          }
          if (analyzed && tier === 'free') {
            trialUsesDuringImport += 1;
            if (!recordTrialPhotoUse(trialUsesDuringImport)) {
              storageStopped = true;
              break;
            }
          }
          if (analyzed && tier === 'premium') {
            premiumUsesDuringImport += 1;
            if (!recordPremiumAiAssist(premiumUsesDuringImport)) {
              storageStopped = true;
              break;
            }
          }
          drafts.push(draft);
          setBulkDrafts(nextDrafts);
        } catch {
          unreadablePhotos += 1;
        }
      }
      if (drafts.length) {
        setView('bulkReview');
        const extra = [
          unreadablePhotos ? `${unreadablePhotos} photo${unreadablePhotos===1?' was':'s were'} unreadable and skipped` : '',
          unavailableAnalyses ? `${unavailableAnalyses} photo${unavailableAnalyses===1?' analysis was':' analyses were'} unavailable and saved for manual review without using a photo analysis` : '',
          leftForNextBatch ? `${leftForNextBatch} photo${leftForNextBatch===1?'':'s'} left for the next batch` : '',
          tier === 'free' ? `${Math.max(0, trialPhotoLimit - trialUsesDuringImport)} Try Before You Buy photo analysis${trialPhotoLimit - trialUsesDuringImport===1?'':'es'} remain` : '',
          tier === 'premium' ? `${Math.max(0,premiumAiAssistLimit-premiumUsesDuringImport)} annual Premium photo analysis${premiumAiAssistLimit-premiumUsesDuringImport===1?'':'es'} remain` : '',
          storageStopped ? 'browser storage is full, so the remaining photos were not added' : ''
        ].filter(Boolean);
        setNotice(`Saved ${drafts.length} draft${drafts.length===1?'':'s'} for review.${extra.length ? ` ${extra.join('; ')}.` : ''}`);
      } else if (durableQueued) {
        setNotice(`${durableQueued} photo${durableQueued===1?' was':'s were'} saved safely and queued for background analysis. You can leave this page; completed drafts will appear for review automatically.`);
      } else {
        setNotice(storageStopped ? 'Browser storage is full, so no photo drafts were saved. Clear space or use a smaller batch.' : 'No photo drafts could be created. Try clearer image files or a smaller batch.');
      }
    } finally {
      setBulkImportLoading(false);
      setBulkImportMessage('');
    }
  };
  queuePresentation={...queuePresentation,canUseAiPhoto,startItemPhotos:files=>void quickPhotoIntake(files)};
  const saveItem = (next: InventoryItem, addAnother = false) => {
    const exists = items.some(item => item.id === next.id);
    if (!exists && tier === 'free' && items.filter(item => !item.archivedAt).length >= 15) {
      setNotice('Protect more than your first 10 assets with AssetVault Complete. Keep building claim-ready proof across your whole inventory.');
      trackActivationEvent('upgrade_prompt_viewed',{reason:'asset_limit'});
      return;
    }
    const all = exists ? items.map(item => item.id === next.id ? next : item) : [next, ...items];
    if(!persistItems(all)) return;
    setItems(all); markLocalChange(); setSelectedId(next.id); setAssistedDraft(undefined); setAssistedWarnings([]);
    if (!exists) {
      const activeCount=all.filter(item=>!item.archivedAt).length;
      if(activeCount===1) trackActivationEvent('first_asset_added');
      if(activeCount===5) trackActivationEvent('five_assets_added');
      if(activeCount===10) trackActivationEvent('top_10_challenge_completed');
      const readiness=proofReadiness(all);
      const milestone=activeCount===1?'first item':activeCount===5?'five items':activeCount===10?'Top 10 Assets Challenge':readiness.score>=70?'Proof Readiness above 70%':'';
      if(milestone && !activation.shownMilestones?.includes(milestone)) {
        const updated={...activation,shownMilestones:[...(activation.shownMilestones??[]),milestone]}; saveActivation(updated); setActivation(updated); setSharePrompt(milestone); trackActivationEvent('share_prompt_viewed',{milestone});
      }
    }
    if (addAnother && !exists) {
      setView('inventory');
      setNotice('Item saved. Ready for the next photo or manual entry.');
      return;
    }
    setView('detail'); setNotice(exists ? 'Item updated.' : 'Item added to inventory.');
  };
  const updateBulkDraft = (id: string, patch: Partial<InventoryItem>) => {
    const next = bulkDrafts.map(draft => draft.id === id ? {...draft, ...patch, updatedAt:new Date().toISOString()} : draft);
    try { saveBulkDrafts(next); } catch { setNotice('This draft change could not be saved because browser storage is full.'); return; }
    setBulkDrafts(next);
  };
  const finishBulkDraft = (id: string, action: 'save'|'skip') => {
    const draft = bulkDrafts.find(item => item.id === id);
    if (!draft) return;
    const remaining = bulkDrafts.filter(item => item.id !== id);
    if (action === 'save') {
      const reviewedDraft = (draft.aiDescription || draft.aiSuggestedTitle) ? {...draft,aiFieldsReviewedAt:new Date().toISOString(),updatedAt:new Date().toISOString()} : draft;
      const all = items.some(item => item.id === reviewedDraft.id) ? items.map(item => item.id === reviewedDraft.id ? reviewedDraft : item) : [reviewedDraft, ...items];
      if(!persistItems(all)) return;
      setItems(all);
      markLocalChange();
      setNotice(`Saved ${reviewedDraft.itemName || 'draft item'}. ${remaining.length ? `${remaining.length} draft${remaining.length===1?'':'s'} left.` : 'Bulk review complete.'}`);
    } else {
      setNotice(remaining.length ? `Skipped draft. ${remaining.length} draft${remaining.length===1?'':'s'} left.` : 'Bulk review complete.');
    }
    try { if (remaining.length) saveBulkDrafts(remaining); else clearBulkDrafts(); } catch { setNotice('The item was saved, but the remaining draft queue could not be updated in browser storage.'); }
    setBulkDrafts(remaining);
    if (!remaining.length) setView('inventory');
  };
  const saveAllBulkDrafts = () => {
    if (!bulkDrafts.length) return;
    const all = [...bulkDrafts.filter(draft => !items.some(item => item.id === draft.id)), ...items];
    if(!persistItems(all)) return;
    setItems(all);
    markLocalChange();
    setNotice(`Saved ${bulkDrafts.length} draft${bulkDrafts.length===1?'':'s'} to inventory. You can refine details later.`);
    try { clearBulkDrafts(); } catch { setNotice('Drafts were saved to inventory, but the saved queue could not be cleared from this browser.'); }
    setBulkDrafts([]);
    setView('inventory');
  };
  const toggleArchive = (item: InventoryItem) => { const next={...item,archivedAt:item.archivedAt?undefined:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!update(next))return;setNotice(item.archivedAt?'Item restored to active inventory.':'Item archived. Incident records are preserved.');setView('inventory'); };
  const find = async () => { if(tier!=='premium'){setNotice('Turn your inventory into claim-ready proof with AssetVault Complete. Value Assist adds current replacement-value links while manual values stay free.');trackActivationEvent('value_assist_clicked');trackActivationEvent('upgrade_prompt_viewed',{reason:'value_assist'});return;} if(!premiumAiAssistsRemaining){setNotice(`Your ${premiumAiAssistLimit} annual Complete photo analyses are used. Add more analyses when billing is enabled, or add a manual value.`);return;} setLoading(true); try { const r = await valuationService.findComparableValues(selected); if(!r.comparableListings.length){setNotice('No suitable comparables were found. Add a clearer item name, make, model, photos, or a manual value.');return;} const saved=update({...selected, estimatedReplacementValueLow:r.estimatedReplacementValueLow, estimatedReplacementValueHigh:r.estimatedReplacementValueHigh, estimatedReplacementValueSelected:r.suggestedReplacementValue, valuationCurrency:'USD', valuationConfidence:r.confidence, valuationSourceSummary:r.sourceSummary, valuationCheckedAt:new Date().toISOString(), comparableListings:r.comparableListings, updatedAt:new Date().toISOString()}); if(saved&&recordPremiumAiAssist(premiumAiUsage.uses+1))setNotice(`Comparable values found and saved. ${Math.max(0,premiumAiAssistsRemaining-1)} annual Complete photo analyses remain.`); } finally { setLoading(false); } };
  const choose = (price: number) => { if(update({...selected, estimatedReplacementValueSelected:price, valuationNotes:'Selected from a saved comparable', updatedAt:new Date().toISOString()}))setNotice('Selected comparable value saved.'); };
  const saveManual = () => { const value=Number(manual); if(value>0&&update({...selected,userEnteredValue:value,updatedAt:new Date().toISOString()})){setManual('');setNotice('Manual value saved.');} };
  const saveQuickSerial = () => { const value=quickSerial.trim(); if(value&&update({...selected,serialNumber:value,updatedAt:new Date().toISOString()})){setQuickSerial('');setNotice('Serial number saved.');} };
  const nav = (target: Exclude<View,'detail'|'form'|'bulkReview'|'onboarding'>, label: string, icon: ReactNode) => <button className={view===target?'nav active':'nav'} onClick={()=>setView(target)}>{icon}<span>{label}</span></button>;
  if (!cloudStatus.authenticated && !localDemoAllowed) return <AccountGate status={cloudStatus} onContinueLocal={continueLocalDemo} onStatusChange={setCloudStatus} waitlistOnly={waitlistOnlyLaunch}/>;
  if (view==='onboarding') return <ProofCheckOnboarding activation={activation} save={updateActivation} finish={startProofCheck}/>;
  return <div className="shell">
    <aside><div className="brand"><ShieldCheck/><b>AssetVault</b></div><p className="eyebrow">PROPERTY EVIDENCE</p>{nav('home','Overview',<Home/>)}{nav('inventory','Inventory',<Package/>)}{nav('coverage','Coverage Center',<CircleGauge/>)}{nav('binder','Home Binder',<Wrench/>)}{nav('locations','Locations',<MapPin/>)}{nav('incident','Incident',<FileText/>)}<div className="spacer"/>{nav('settings','Settings',<Settings/>)}<div className="privacy"><LockKeyhole/><div><b>{cloudStatus.authenticated?'Cloud account':'Local demo'}</b><small>{cloudStatus.authenticated?cloudStatus.email:'Data stays in this browser'}</small></div></div></aside>
    <main>{notice&&<button className="toast" onClick={()=>setNotice('')} aria-label="Dismiss notification"><Check/>{notice}</button>}
      <AccountStatusBanner status={cloudStatus} tier={tier} trialPhotosRemaining={trialPhotosRemaining} premiumAiAssistsRemaining={premiumAiAssistsRemaining} queuedAnalysisCount={queuedAnalysisCount} syncState={cloudSyncState} syncMessage={cloudSyncMessage}/>
      {view==='home'&&<HomeView items={items} tier={tier} activation={activation} trialPhotosRemaining={trialPhotosRemaining} premiumAiAssistsRemaining={premiumAiAssistsRemaining} canUseAiPhoto={canUseAiPhoto} open={open} add={startNew} startBulk={bulkPhotoIntake} bulkLoading={bulkImportLoading} bulkMessage={bulkImportMessage} pendingBulkDrafts={bulkDrafts.length} resumeBulk={()=>setView('bulkReview')} upgrade={()=>setTier('premium')} review={()=>setView('coverage')} incident={()=>setView('incident')}/>} {view==='inventory'&&<InventoryView items={items} tier={tier} trialPhotosRemaining={trialPhotosRemaining} premiumAiAssistsRemaining={premiumAiAssistsRemaining} canUseAiPhoto={canUseAiPhoto} upgrade={()=>setTier('premium')} localChange={markLocalChange} open={open} edit={startEdit} add={startNew} bulkIntake={bulkPhotoIntake} bulkLoading={bulkImportLoading} bulkMessage={bulkImportMessage} pendingBulkDrafts={bulkDrafts.length} resumeBulk={()=>setView('bulkReview')} quickIntake={quickPhotoIntake} intakeLoading={intakeLoading}/>} {view==='coverage'&&<CoverageCenterView items={items} open={open}/>} {view==='binder'&&<HomeBinderView items={items} open={open} edit={startEdit} completeMaintenance={completeMaintenance}/>} {view==='bulkReview'&&<BulkReviewView drafts={bulkDrafts} update={updateBulkDraft} save={id=>finishBulkDraft(id,'save')} skip={id=>finishBulkDraft(id,'skip')} saveAll={saveAllBulkDrafts} back={()=>setView('inventory')}/>} {view==='detail'&&selected&&<DetailView item={selected} tier={tier} loading={loading} back={()=>setView('inventory')} edit={()=>startEdit(selected.id)} archive={()=>toggleArchive(selected)} find={find} choose={choose} manual={manual} setManual={setManual} saveManual={saveManual} quickSerial={quickSerial} setQuickSerial={setQuickSerial} saveQuickSerial={saveQuickSerial} upgrade={()=>setTier('premium')}/>} {view==='form'&&<ItemForm locations={locations} tier={tier} onUpgrade={()=>setTier('premium')} item={editingId ? items.find(item=>item.id===editingId) : assistedDraft} assisted={Boolean(assistedDraft)} assistedWarnings={assistedWarnings} onCancel={()=>{setAssistedDraft(undefined);setAssistedWarnings([]);setView(editingId?'detail':'inventory')}} onSave={saveItem} onSaveAndAddAnother={next=>saveItem(next,true)}/>} {view==='locations'&&<LocationsManager locations={locations} items={items} onChange={updateLocations}/>} {view==='incident'&&<IncidentManager items={items} tier={tier} onLocalChange={markLocalChange} onUpgrade={()=>setTier('premium')}/>} {view==='settings'&&<SettingsView items={items} locations={locations} tier={tier} plan={selectedPlan} activation={activation} trialPhotosRemaining={trialPhotosRemaining} premiumAiAssistsRemaining={premiumAiAssistsRemaining} status={cloudStatus} syncState={cloudSyncState} syncMessage={cloudSyncMessage} setPlan={setPlan} updateActivation={updateActivation} restore={restoreBackup} restoreCloud={restoreCloudSnapshot} resetDemoData={resetDemoData}/>}
      {sharePrompt&&<section className="sharePrompt" role="dialog" aria-label="Share AssetVault Proof Check"><div><p className="eyebrow green">PROOF MILESTONE</p><h2>You reached {sharePrompt}.</h2><p>Most people are not ready to prove what they own. Invite someone to run their free AssetVault Proof Check.</p></div><div><button onClick={()=>setSharePrompt(undefined)}>Not now</button><button className="primary" onClick={async()=>{try{if(navigator.share)await navigator.share({title:'AssetVault Proof Check',text:'Run a free AssetVault Proof Check and see what proof you are missing before theft, disaster, or loss.'});else await navigator.clipboard.writeText('Run a free AssetVault Proof Check and see what proof you are missing before theft, disaster, or loss.');setNotice('Invitation ready to share.')}catch{setNotice('Could not open sharing on this device.')}finally{setSharePrompt(undefined)}}}>Invite someone</button></div></section>}
    </main>
  </div>;
}

function PageHead({kicker,title,sub}:{kicker:string;title:string;sub:string}){return <header><p className="eyebrow green">{kicker}</p><h1>{title}</h1><p className="sub">{sub}</p></header>}
function AccountStatusBanner({status,tier,trialPhotosRemaining,premiumAiAssistsRemaining,queuedAnalysisCount,syncState,syncMessage}:{status:CloudStatus;tier:SubscriptionTier;trialPhotosRemaining:number;premiumAiAssistsRemaining:number;queuedAnalysisCount:number;syncState:'idle'|'loading'|'saving'|'saved'|'error';syncMessage:string}){
  const signedIn=status.authenticated;
  const syncLabel=signedIn?(syncMessage||'Autosave ready'):'Local demo only';
  const accessLabel=tier==='premium'?`AssetVault Complete preview - ${premiumAiAssistsRemaining} photo analyses left`:trialPhotosRemaining?`AssetVault Proof Check preview - ${trialPhotosRemaining} photo analysis trial${trialPhotosRemaining===1?'':'s'} left`:'AssetVault Proof Check preview - photo analysis trial used';
  return <section className={`accountStatusBanner ${signedIn?'cloud':'local'} ${syncState}`} aria-label="Account and sync status"><div><Cloud/><span>{signedIn?'Signed-in account':'Local demo'}</span></div><div><ShieldCheck/><span>{accessLabel}</span></div>{queuedAnalysisCount>0&&<div><Sparkles/><span>{queuedAnalysisCount} photo{queuedAnalysisCount===1?'':'s'} analyzing safely</span></div>}<small>{syncLabel}</small></section>;
}
function ItemIcon({category}:{category:string}){return <div className="itemicon">{category==='Jewelry'?<Tag/>:<Package/>}</div>}
function StoredPhoto({value,alt}:{value:string;alt:string}){
  const [src,setSrc]=useState(value);
  useEffect(()=>{let active=true;evidenceStorageService.resolveDisplayUrl(value).then(url=>{if(active)setSrc(url||'')}).catch(()=>{if(active)setSrc('')});return()=>{active=false}},[value]);
  return src.startsWith('data:image')||src.startsWith('http')?<img src={src} alt={alt}/>:<div className="photoPlaceholder"><Camera/>Saved photo</div>;
}
function ItemPhotoAssist({canUseAiPhoto,startItemPhotos}:{canUseAiPhoto?:boolean;startItemPhotos?:(files:File[])=>void}){
  const inputRef=useRef<HTMLInputElement>(null);
  if (!startItemPhotos) return null;
  return <section className="panel itemPhotoAssist"><div><p className="eyebrow green">ONE ITEM, BETTER RESULTS</p><h2>Add an overview plus close-ups</h2><p>Choose up to four photos of the same item. Start with a clear overall photo, then add close-ups of the brand, model, serial number, barcode, receipt, or distinguishing marks.</p><ul><li>Keep the item centered and well lit.</li><li>Make and model labels should fill the frame when possible.</li><li>Serial numbers are usually on a separate close-up; AssetVault will flag them for verification.</li><li>If the overview contains several separate items, AssetVault creates review cards so you choose which ones to save.</li></ul></div><div className="itemPhotoAction"><button className="primary" type="button" disabled={!canUseAiPhoto} onClick={()=>inputRef.current?.click()}><Camera/>{canUseAiPhoto?'Add photos of one item':'Enable photo analysis'}</button><small>One overview + up to three close-ups</small></div><input ref={inputRef} className="visuallyHiddenInput" type="file" aria-label="Choose overview and close-up photos of one item" accept="image/*" capture="environment" multiple disabled={!canUseAiPhoto} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value='';if(files.length)startItemPhotos(files);}}/></section>;
}
function PhotoAnalysisQueue({jobs,pendingDrafts,resumeReview,signedIn,retryFailed,retryingJobId}:{jobs:AnalysisJob[];pendingDrafts:number;resumeReview:()=>void;signedIn:boolean;retryFailed?:(jobId:string)=>void;retryingJobId?:string|null}){
  if (!signedIn) return null;
  const visible=jobs.filter(job=>job.status!=='cancelled');
  const analyzing=visible.filter(job=>['queued','processing','retrying'].includes(job.status));
  const ready=visible.filter(job=>job.status==='complete');
  const sentToReview=visible.filter(job=>job.status==='reviewed');
  const needsHelp=visible.filter(job=>job.status==='failed');
  if (!visible.length && !pendingDrafts) return null;
  const statusCopy=(job:AnalysisJob)=>job.status==='queued'?'Saved — waiting to start':job.status==='processing'?'Analyzing photo':job.status==='retrying'?'Temporarily busy — retrying automatically':job.status==='complete'?'Ready for your quick review':job.status==='reviewed'?'Analyzed — sent to Bulk Review':'Needs attention';
  const context=(job:AnalysisJob)=>[job.item_context?.location,job.item_context?.room].filter(Boolean).join(' · ') || 'Photo saved to your account';
  const queueTotal=sentToReview.length+analyzing.length+ready.length+needsHelp.length;
  const heading=analyzing.length?`${analyzing.length} photo${analyzing.length===1?'':'s'} being analyzed`:sentToReview.length?`${sentToReview.length}/${queueTotal} photo${queueTotal===1?'':'s'} analyzed`:'Your photo analysis activity';
  return <section className="panel photoAnalysisQueue" aria-label="Photo analysis queue"><div className="sectionTitle"><div><p className="eyebrow green">PHOTO ANALYSIS QUEUE</p><h2>{heading}</h2></div><span className="queueLive"><Sparkles/>Updates automatically</span></div><p className="queueIntro">{sentToReview.length?`${sentToReview.length}/${queueTotal} analyzed and sent to Bulk Review. Your drafts are ready when you are.`:'Every photo is saved to your account first. You can leave the app while analysis continues.'}</p>{(ready.length||pendingDrafts>0)&&<div className="queueReady"><div><b>{pendingDrafts||ready.length} draft{(pendingDrafts||ready.length)===1?'':'s'} ready to review</b><small>Confirm the name, make, model, serial number, and value before saving.</small></div><button className="primary" onClick={resumeReview}>Review now</button></div>}{visible.map(job=>{const retrying=retryingJobId===job.id;return <div className={`analysisJob ${job.status}`} key={job.id}><div className="analysisJobPhoto"><StoredPhoto value={analysisStorageReference(job.storage_path)} alt="Saved photo waiting for analysis"/></div><div><b>{retrying?'Restarting analysis…':statusCopy(job)}</b><small>{context(job)}</small><small>Added {dateTime(job.created_at)}{job.attempts>1?` · Attempt ${job.attempts}`:''}</small>{job.status==='failed'&&job.last_error&&<span className="analysisError">{job.last_error}</span>}</div><div className="analysisJobAction"><span className={`jobStatus ${job.status}`}>{retrying?'Restarting':job.status==='processing'?'Working':job.status==='retrying'?'Retrying':job.status==='complete'?'Ready':job.status==='reviewed'?'Sent to review':job.status==='failed'?'Needs help':'Queued'}</span>{job.status==='failed'&&retryFailed&&<button disabled={retrying} onClick={()=>retryFailed(job.id)}>{retrying?'Restarting…':'Retry analysis'}</button>}</div></div>;})}{needsHelp.length>0&&<p className="queueHelp">This photo remains saved. Fix the message above, then choose Retry analysis; no re-upload is needed.</p>}</section>;
}
function Score({item}:{item:InventoryItem}){const s=completenessScore(item);return <div className="score" aria-label={`Proof Score ${s.score}%`}><span style={{width:`${s.score}%`}}/><small>{s.score}%</small></div>}
function ItemRow({item,open}:{item:InventoryItem;open:(id:string)=>void}){return <button className="itemrow" onClick={()=>open(item.id)}><ItemIcon category={item.category}/><div><b>{item.itemName}</b><small>{item.location} - {item.serialNumber||item.ownerMarking||'Needs identifier'}</small></div><Score item={item}/><ChevronRight/></button>}

function HomeView({items,tier,activation,trialPhotosRemaining,premiumAiAssistsRemaining,canUseAiPhoto,open,add,startBulk,bulkLoading,bulkMessage,pendingBulkDrafts,resumeBulk,upgrade,review,incident}:{items:InventoryItem[];tier:SubscriptionTier;activation:AssetVaultActivation;trialPhotosRemaining:number;premiumAiAssistsRemaining:number;canUseAiPhoto:boolean;open:(id:string)=>void;add:()=>void;startBulk:(files:File[],location?:string,room?:string)=>void;bulkLoading:boolean;bulkMessage:string;pendingBulkDrafts:number;resumeBulk:()=>void;upgrade:()=>void;review:()=>void;incident:()=>void}){
  const active=items.filter(item=>!item.archivedAt);
  const readiness=proofReadiness(active);
  const challengeProgress=Math.min(10,active.length);
  const reviewTotal=itemReviewBacklog(active,1).total;
  const weak=active.map(item=>({item,...completenessScore(item)})).filter(entry=>entry.score<70).sort((a,b)=>a.score-b.score).slice(0,3);
  const bulkInputRef=useRef<HTMLInputElement>(null);
  const isPremium=tier==='premium';
  const photoActionLabel=bulkLoading?'Building drafts...':isPremium?'Add many photos':canUseAiPhoto?`Try ${trialPhotosRemaining} photo${trialPhotosRemaining===1?'':'s'} free`:'Preview AssetVault Complete';
  const photoHelp=isPremium?`Your annual Premium plan includes ${premiumAiAssistLimit} photo analyses; ${premiumAiAssistsRemaining} remain. Choose one clear overview photo per item. Each analysis drafts item names, make, model, serial-number candidates, and replacement estimates for quick review.`:canUseAiPhoto?`Try Before You Buy includes ${trialPhotosRemaining} free photo analysis${trialPhotosRemaining===1?'':'es'} on this browser. Each creates a suggested description, make/model/SN candidate, and approximate replacement estimate for review.`:'Your three Try Before You Buy photo analyses are used. Add items manually, or enable AssetVault Complete preview for more photo analysis.';
  return <><PageHead kicker="ASSETVAULT PROOF CHECK" title="Find out whether your valuables are claim-ready." sub={activation.primaryConcern?`Built for ${activation.primaryConcern.toLowerCase()}. Start with the things you would most regret not being able to prove.`:'Start with the things you would most regret not being able to prove after a loss.'}/><section className="panel topTenChallenge"><div><p className="eyebrow green">TOP 10 ASSETS CHALLENGE</p><h2>{challengeProgress}/10 assets documented</h2><p>Start with the 10 items you would most regret not being able to prove after a theft, fire, flood, or claim.</p><div className="challengeMeter" aria-label={`${challengeProgress} of 10 assets documented`}><span style={{width:`${challengeProgress*10}%`}}/></div><small>Jewelry · Tools · Electronics · Bikes · Instruments · Cameras · Outdoor equipment · Collectibles · Storage contents · Trailer or business equipment</small></div><button className="primary" onClick={add}><Plus/>{challengeProgress<10?'Document next asset':'Keep strengthening proof'}</button></section><section className="panel proofReadiness"><div className="sectionTitle"><div><p className="eyebrow green">YOUR PROOF READINESS</p><h2>{readiness.score}% ready</h2><p>{readiness.totalAssets?`You have documented ${money(readiness.totalEstimatedValue)} in assets, but ${Math.max(readiness.missingSerials,readiness.missingOwnerMarks,readiness.missingValues)} item${Math.max(readiness.missingSerials,readiness.missingOwnerMarks,readiness.missingValues)===1?' is':'s are'} still missing important proof.`:'Add your first item to see the proof you have and the proof you are missing.'}</p></div><button onClick={review}><CircleGauge/>See proof gaps</button></div><div className="readinessMeter"><span style={{width:`${readiness.score}%`}}/></div><div className="readinessGrid"><span><b>{readiness.totalAssets}</b>Total assets</span><span><b>{money(readiness.totalEstimatedValue)}</b>Estimated value</span><span><b>{readiness.missingSerials}</b>Missing serials</span><span><b>{readiness.missingOwnerMarks}</b>Missing Owner Marks</span><span><b>{readiness.missingPhotos}</b>Missing photos</span><span><b>{readiness.missingValues}</b>Missing values</span><span><b>{readiness.missingReceiptsOrAppraisals}</b>Missing receipts/appraisals</span><span><b>{readiness.claimReady}</b>Claim-ready</span></div>{tier==='free'&&readiness.totalAssets>=3&&<div className="readinessUpgrade"><b>Turn your inventory into claim-ready proof.</b><span>AssetVault Complete adds Value Assist, multiple locations, documents, saved comparables, and polished incident packets.</span><button onClick={upgrade}>Preview Complete</button></div>}</section>{pendingBulkDrafts>0&&<section className="panel resumeBatch"><div><p className="eyebrow green">SAVED PHOTO BATCH</p><h2>{pendingBulkDrafts} draft{pendingBulkDrafts===1?'':'s'} ready to review</h2><p>Your batch is saved in this browser. Finish the key fields now or save the drafts to inventory for later.</p></div><button className="primary" onClick={resumeBulk}>Resume review</button></section>}<section className="panel startPanel"><div><p className="eyebrow green">{isPremium?'FASTEST PATH':'TRY BEFORE YOU BUY'}</p><h2>Walk around and add many photos</h2><p>{photoHelp}</p><small>{isPremium?'Complete includes up to three active devices while household sharing is introduced securely.':'Proof Check includes a small photo-analysis trial; manual documentation remains free.'}</small>{bulkMessage&&<small className="bulkProgress">{bulkMessage}</small>}</div><button className="primary heroAction" disabled={bulkLoading} onClick={()=>canUseAiPhoto?bulkInputRef.current?.click():upgrade()}><Camera/>{photoActionLabel}</button><input ref={bulkInputRef} className="visuallyHiddenInput" type="file" accept="image/*" multiple aria-label="Choose item photos for photo analysis" onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value='';void startBulk(files)}}/></section><div className="quickActions"><button onClick={add}><Plus/><b>Add one item</b><span>Manual entry with photos, make, model, SN, and value.</span></button><button onClick={review}><TriangleAlert/><b>See proof gaps</b><span>{reviewTotal?`${reviewTotal} quick check${reviewTotal===1?'':'s'} waiting`:'Everything looks strong'}</span></button><button onClick={incident}><FileText/><b>Create incident packet</b><span>Build a police or insurance export from saved items.</span></button></div><div className="stats simplified"><div><Package/><span><b>{active.length}</b>Items saved</span></div><div><ShieldCheck/><span><b>{active.filter(i=>i.make||i.model||i.serialNumber).length}</b>With make, model, or SN</span></div><div><Sparkles/><span><b>{active.filter(i=>i.estimatedReplacementValueSelected||i.userEnteredValue).length}</b>With value</span></div></div>{weak.length>0&&<section className="panel guidancePanel"><div className="sectionTitle"><div><p className="eyebrow">BEST NEXT FIXES</p><h2>Make these records stronger</h2><small>Make, model, and serial number matter most for value and recovery.</small></div><span>{weak.length} priority</span></div>{weak.map(entry=><button key={entry.item.id} onClick={()=>open(entry.item.id)}><TriangleAlert/><div><b>{entry.item.itemName}</b><small>{entry.feedback}</small></div><strong>{entry.score}%</strong><ChevronRight/></button>)}</section>}<section className="panel"><div className="sectionTitle"><div><p className="eyebrow">RECENT INVENTORY</p><h2>Recently saved</h2></div><span className="tier">{isPremium?`${premiumAiAssistsRemaining} Complete analyses left`:`${trialPhotosRemaining} photo analysis trial${trialPhotosRemaining===1?'':'s'} left`}</span></div>{active.length?active.slice(0,4).map(item=><ItemRow key={item.id} item={item} open={open}/>):<div className="empty"><Package/><h3>No items yet</h3><p>Start with a batch of photos or add one item manually.</p></div>}</section></>;
}
function ReviewQueue({items,open,edit}:{items:InventoryItem[];open:(id:string)=>void;edit:(id:string)=>void}){
  const {records,total,issueSummary}=itemReviewBacklog(items,4);
  const first=records[0];
  const reviewPanel=!records.length ? <section className="panel reviewQueue clear"><div className="sectionTitle"><div><p className="eyebrow">BULK REVIEW QUEUE</p><h2>All quick checks are clear</h2><small>{items.length ? 'No active item currently needs suggested-detail review, make/model, serial verification, value, photo, receipt, or appraisal follow-up.' : 'Add items with fast photo intake, then review tasks will appear here.'}</small></div><span className="ok"><Check/>Clear</span></div></section> : <section className="panel reviewQueue"><div className="sectionTitle"><div><p className="eyebrow">BULK REVIEW QUEUE</p><h2>Quick checks before you move on</h2><small>Sorted so make/model, suggested details, and serial checks float to the top.</small></div><div className="queueActions"><span>{records.length} of {total} shown</span>{first&&<button onClick={()=>edit(first.item.id)}>Review next</button>}</div></div><div className="reviewChips" aria-label="Review backlog by issue type">{issueSummary.map(issue=><span key={issue.id}>{issue.label}: {issue.count}</span>)}</div>{records.map(record=><button key={record.item.id} onClick={()=>open(record.item.id)}><TriangleAlert/><div><b>{record.item.itemName}</b><small>{record.flags[0].label} - {record.flags[0].detail}</small><span className="reviewReasons">{record.flags.map(flag=>flag.label).join(' - ')}</span></div><ChevronRight/></button>)}</section>;
  return <><ItemPhotoAssist {...queuePresentation}/><PhotoAnalysisQueue {...queuePresentation}/>{reviewPanel}</>;
}
function BulkReviewView({drafts,update,save,skip,saveAll,back}:{drafts:InventoryItem[];update:(id:string,patch:Partial<InventoryItem>)=>void;save:(id:string)=>void;skip:(id:string)=>void;saveAll:()=>void;back:()=>void}){
  const current=drafts[0];
  if(!current)return <section className="panel empty"><Check/><h2>Bulk review complete</h2><p>All photo drafts have been handled.</p><button className="primary" onClick={back}>Back to inventory</button></section>;
  const photo=current.photos.find(value=>value.startsWith('data:image')||isSupabaseStorageReference(value))??current.photos[0];
  const setText=(key:keyof InventoryItem)=>(event:ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>update(current.id,{[key]:event.target.value} as Partial<InventoryItem>);
  const setValue=(event:ChangeEvent<HTMLInputElement>)=>update(current.id,{userEnteredValue:event.target.value?Number(event.target.value):undefined});
  return <><div className="detailToolbar"><button className="back" onClick={back}><ArrowLeft/>Inventory</button><div className="bulkCount">{drafts.length} draft{drafts.length===1?'':'s'} waiting</div></div><section className="panel bulkReviewHero"><div><p className="eyebrow green">QUICK REVIEW</p><h1>Check the fields that matter most.</h1><p>Make and model drive replacement value. Serial number helps identify lost or stolen property. This saved batch survives refreshes, so you can stop and return later.</p></div><button className="primary" onClick={saveAll}><Check/>Save all drafts for later</button></section><section className="panel bulkDraftCard">{photo&&photo.startsWith('data:image')?<img src={photo} alt={`${current.itemName || 'Draft item'} photo`} />:<div className="photoPlaceholder"><Camera/>Photo draft</div>}<div className="bulkDraftFields"><div className="reviewStep"><span>1</span><b>Name the item</b></div><label>Item name<input value={current.itemName} onChange={setText('itemName')} placeholder="Cordless drill, TV, bicycle..."/></label><div className="fields three priorityFields"><label>Make<input value={current.make??''} onChange={setText('make')} placeholder="Milwaukee"/></label><label>Model<input value={current.model??''} onChange={setText('model')} placeholder="M18 2801-20"/></label><label>Serial number (SN)<input value={current.serialNumber??''} onChange={setText('serialNumber')} placeholder="Verify from label"/></label></div><div className="fields two"><label>Location<input value={current.location} onChange={setText('location')}/></label><label>Your value (optional)<input type="number" min="0" step="0.01" value={current.userEnteredValue??''} onChange={setValue} placeholder="Enter your own replacement value"/></label></div>{current.estimatedReplacementValueSelected&&<p className="estimateHint">Suggested estimate: {money(current.estimatedReplacementValueSelected)} - {current.valuationConfidence || 'unknown'} confidence</p>}<label>Quick notes<textarea value={current.notes??''} onChange={setText('notes')} placeholder="Accessories, condition, visible details..."/></label><div className="bulkReviewActions"><button className="primary" onClick={()=>save(current.id)}><Check/>Save this item</button><button onClick={()=>skip(current.id)}>Skip photo</button></div><p className="helper">One uploaded photo creates one item draft. For multiple angles of the same item, save this record first, then attach more photos from the item screen. Suggested make, model, and SN should be verified against the item, label, receipt, or packaging.</p></div></section></>;
}
function InventoryView({items,tier,trialPhotosRemaining,premiumAiAssistsRemaining,canUseAiPhoto,upgrade,localChange,open,edit,add,bulkIntake,bulkLoading,bulkMessage,pendingBulkDrafts,resumeBulk,quickIntake,intakeLoading}:{items:InventoryItem[];tier:SubscriptionTier;trialPhotosRemaining:number;premiumAiAssistsRemaining:number;canUseAiPhoto:boolean;upgrade:()=>void;localChange:()=>void;open:(id:string)=>void;edit:(id:string)=>void;add:()=>void;bulkIntake:(files:File[],defaultLocation?:string,defaultRoom?:string)=>void;bulkLoading:boolean;bulkMessage:string;pendingBulkDrafts:number;resumeBulk:()=>void;quickIntake:(file:File,defaultLocation?:string,defaultRoom?:string)=>void;intakeLoading:boolean}){
  const[query,setQuery]=useState('');
  const[showArchived,setShowArchived]=useState(false);
  const[filters,setFilters]=useState<InventoryFilters>({});
  const initialBatch=loadBatchDefaults();
  const[batchLocation,setBatchLocationState]=useState(initialBatch.location);
  const[batchRoom,setBatchRoomState]=useState(initialBatch.room);
  const isPremium=tier==='premium';
  const trialLabel=`${trialPhotosRemaining} free photo analysis trial${trialPhotosRemaining===1?'':'s'} left`;
  const setBatchLocation=(value:string)=>{setBatchLocationState(value);try{saveBatchDefaults({location:value,room:batchRoom});localChange()}catch{}};
  const setBatchRoom=(value:string)=>{setBatchRoomState(value);try{saveBatchDefaults({location:batchLocation,room:value});localChange()}catch{}};
  const fileInputRef=useRef<HTMLInputElement>(null);
  const bulkInputRef=useRef<HTMLInputElement>(null);
  const active=items.filter(item=>!item.archivedAt);
  const locationOptions=Array.from(new Set(items.map(item=>item.location).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const categoryOptions=Array.from(new Set(items.map(item=>item.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const filtered=filterInventoryItems(items,{...filters,query,includeArchived:showArchived});
  const intakeTitle=isPremium?'Add many photos at once':canUseAiPhoto?'Try Before You Buy photo analysis':'Your free photo analysis trial is used';
  const intakeDescription=isPremium?`Choose one clear overview photo per item. This annual plan includes ${premiumAiAssistLimit} photo analyses; ${premiumAiAssistsRemaining} remain. Saved drafts let you continue room by room.`:canUseAiPhoto?`Use up to ${trialPhotosRemaining} free photo${trialPhotosRemaining===1?'':'s'} for a suggested description, make/model help, SN candidates, and approximate value estimates. This prototype count is stored in this browser.`:'Add items and values manually, or enable AssetVault Complete preview for more photo analysis.';
  return <><div className="pageTitleRow"><PageHead kicker="INVENTORY" title="Documented property" sub="Add batches first, then review the important details: make, model, SN, and value."/><button className="primary addButton" onClick={add}><Plus/>Add one item</button></div>{pendingBulkDrafts>0&&<section className="panel resumeBatch"><div><p className="eyebrow green">SAVED PHOTO BATCH</p><h2>{pendingBulkDrafts} draft{pendingBulkDrafts===1?'':'s'} ready to review</h2><p>These drafts survive a refresh. Save the key facts one by one, or save all drafts to inventory for later.</p></div><button className="primary" onClick={resumeBulk}>Resume review</button></section>}<section className="panel intakePanel bulkFirst"><div><p className="eyebrow green">{isPremium?'BULK PHOTO IMPORT':'TRY BEFORE YOU BUY'}</p><h2>{intakeTitle}</h2><p>{intakeDescription}</p><small>{bulkMessage||'Tip: set the room first so every draft starts in the right place.'}</small><div className="batchDefaults"><label>Apply location to new photos<input list="batch-locations" value={batchLocation} onChange={event=>setBatchLocation(event.target.value)} placeholder="Garage, storage unit, bedroom?"/><datalist id="batch-locations">{locationOptions.map(location=><option key={location} value={location}/>)}</datalist></label><label>Room / area<input value={batchRoom} onChange={event=>setBatchRoom(event.target.value)} placeholder="Shelf, closet, tool cabinet?"/></label></div></div><div className="intakeButtons"><button className="primary intakeButton" type="button" disabled={bulkLoading} onClick={()=>canUseAiPhoto?bulkInputRef.current?.click():upgrade()}><Camera/>{bulkLoading?'Building drafts...':isPremium?'Add many photos':canUseAiPhoto?`Try photo analysis (${trialLabel})`:'Preview AssetVault Complete'}</button><button className="secondaryAction" type="button" disabled={intakeLoading} onClick={()=>canUseAiPhoto?fileInputRef.current?.click():upgrade()}><Plus/>{intakeLoading?'Analyzing...':isPremium?'Add one photo':canUseAiPhoto?'Try one photo':'Preview AssetVault Complete'}</button></div><input ref={bulkInputRef} className="visuallyHiddenInput" type="file" aria-label="Choose item photos for photo analysis" accept="image/*" multiple disabled={bulkLoading||!canUseAiPhoto} onChange={event=>{const files=Array.from(event.currentTarget.files??[]);if(files.length)bulkIntake(files,batchLocation.trim()||undefined,batchRoom.trim()||undefined);event.currentTarget.value='';}}/><input ref={fileInputRef} className="visuallyHiddenInput" type="file" aria-label="Choose one item photo for photo analysis" accept="image/*" capture="environment" disabled={intakeLoading||!canUseAiPhoto} onChange={event=>{const file=event.currentTarget.files?.[0];if(file)quickIntake(file,batchLocation.trim()||undefined,batchRoom.trim()||undefined);event.currentTarget.value='';}}/></section><ReviewQueue items={active} open={open} edit={edit}/><div className="inventoryTools"><div className="search"><Search/><input aria-label="Search inventory" placeholder="Search item, make/model, serial, barcode, marking, or room" value={query} onChange={event=>setQuery(event.target.value)}/></div><label>Category<select aria-label="Filter by category" value={filters.category??''} onChange={event=>setFilters(current=>({...current,category:event.target.value||undefined}))}><option value="">All categories</option>{categoryOptions.map(category=><option key={category}>{category}</option>)}</select></label><label>Location<select aria-label="Filter by location" value={filters.location??''} onChange={event=>setFilters(current=>({...current,location:event.target.value||undefined}))}><option value="">All locations</option>{locationOptions.map(location=><option key={location}>{location}</option>)}</select></label><label>Status<select aria-label="Filter by status" value={filters.status??''} onChange={event=>setFilters(current=>({...current,status:(event.target.value||undefined) as InventoryFilters['status']}))}><option value="">All statuses</option>{['normal','stolen','damaged','destroyed','missing','recovered'].map(status=><option key={status}>{status}</option>)}</select></label><label><input type="checkbox" checked={Boolean(filters.hasSerialNumber)} onChange={event=>setFilters(current=>({...current,hasSerialNumber:event.target.checked||undefined}))}/> Has SN</label><label><input type="checkbox" checked={Boolean(filters.hasOwnerMarking)} onChange={event=>setFilters(current=>({...current,hasOwnerMarking:event.target.checked||undefined}))}/> Has marking</label><label><input type="checkbox" checked={Boolean(filters.missingValue)} onChange={event=>setFilters(current=>({...current,missingValue:event.target.checked||undefined}))}/> Missing value</label><label><input type="checkbox" checked={Boolean(filters.missingPhotos)} onChange={event=>setFilters(current=>({...current,missingPhotos:event.target.checked||undefined}))}/> Missing photos</label><label><input type="checkbox" checked={Boolean(filters.lowDocumentation)} onChange={event=>setFilters(current=>({...current,lowDocumentation:event.target.checked||undefined}))}/> Low score</label><button className={showArchived?'selected':''} onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Showing archived':'View archived'} ({items.filter(item=>item.archivedAt).length})</button><button onClick={()=>{setQuery('');setFilters({});}}>Clear filters</button></div><section className="panel">{filtered.length?filtered.map(item=><ItemRow key={item.id} item={item} open={open}/>):<div className="empty"><Search/><h3>No matching items</h3><p>{showArchived?'No archived items match this search.':'Try a different item name, make, model, serial number, marking, barcode, or location.'}</p></div>}</section></>;
}

interface DetailProps{item:InventoryItem;tier:SubscriptionTier;loading:boolean;back:()=>void;edit:()=>void;archive:()=>void;find:()=>void;choose:(price:number)=>void;manual:string;setManual:(value:string)=>void;saveManual:()=>void;quickSerial:string;setQuickSerial:(value:string)=>void;saveQuickSerial:()=>void;upgrade:()=>void}
function DetailView({item,tier,loading,back,edit,archive,find,choose,manual,setManual,saveManual,quickSerial,setQuickSerial,saveQuickSerial,upgrade}:DetailProps){const c=completenessScore(item);const best=item.comparableListings[0];const reviewFlags=itemReviewFlags(item);const[confirmArchive,setConfirmArchive]=useState(false);return <><div className="detailToolbar"><button className="back" onClick={back}><ArrowLeft/>Inventory</button><div className="detailActions"><button onClick={edit}><Pencil/>Edit item</button><button className={item.archivedAt?'restoreButton':'archiveButton'} onClick={()=>item.archivedAt?archive():setConfirmArchive(true)}>{item.archivedAt?'Restore item':'Archive item'}</button></div></div>{confirmArchive&&<div className="confirmStrip"><div><b>Archive this item?</b><span>It will leave active inventory but remain available to existing incident records.</span></div><button onClick={()=>setConfirmArchive(false)}>Cancel</button><button className="dangerButton" onClick={archive}>Archive</button></div>}<div className="detailHead"><ItemIcon category={item.category}/><div><p className="eyebrow green">{item.category}{item.archivedAt?' - ARCHIVED':''}</p><h1>{item.itemName}</h1><p>{item.make} {item.model} - {item.location}</p></div><div className="scorebox"><b>{c.score}%</b><span>Proof Score · {c.label}</span></div></div><div className="grid"><div>{reviewFlags.length>0&&<section className="panel reviewChecklist"><div className="sectionTitle"><div><p className="eyebrow">REVIEW BEFORE RELYING ON THIS RECORD</p><h2>Finish these quick checks</h2></div><button onClick={edit}>Edit details</button></div>{reviewFlags.map(flag=><div className={`reviewFlag ${flag.priority}`} key={flag.id}><TriangleAlert/><div><b>{flag.label}</b><small>{flag.detail}</small>{flag.id==='verify-serial'&&<div className="quickValue"><input aria-label="Quick serial number" value={quickSerial} onChange={e=>setQuickSerial(e.target.value)} placeholder={item.serialNumber?.startsWith('VERIFY-')?'Enter confirmed serial':item.serialNumber||'Enter confirmed serial'}/><button onClick={saveQuickSerial}>Save serial</button></div>}{flag.id==='add-value'&&<div className="quickValue"><input aria-label="Quick manual value" type="number" value={manual} onChange={e=>setManual(e.target.value)} placeholder={item.userEnteredValue?`Manual value: ${money(item.userEnteredValue)}`:'Enter value now'}/><button onClick={saveManual}>Save value</button></div>}</div></div>)}</section>}<section className="panel facts"><div className="sectionTitle"><h2>Serial Tracker & Owner Marks</h2><span className="ok"><Check/>Documented</span></div>{item.photos.some(photo=>photo.startsWith('data:image'))&&<div className="detailPhotos">{item.photos.filter(photo=>photo.startsWith('data:image')).map((photo,index)=><img key={`${photo.slice(0,24)}-${index}`} src={photo} alt={`${item.itemName} photo ${index+1}`}/>)}</div>}<dl><div><dt>Serial Tracker</dt><dd>{item.serialNumber||'Not recorded'}</dd></div><div><dt>Owner Mark</dt><dd>{item.ownerMarking||'Not recorded'}</dd></div><div><dt>Owner Mark location</dt><dd>{item.markingLocation||'Not recorded'}</dd></div><div><dt>Condition</dt><dd>{item.condition}</dd></div></dl><p className="feedback">{c.feedback}</p></section><section className="panel valuation"><div className="valueTitle"><div className="spark"><Sparkles/></div><div><p className="eyebrow green">ASSETVAULT COMPLETE ASSIST</p><h2>Value Assist</h2></div>{tier==='premium'&&<span className="premium">COMPLETE+</span>}</div>
  {item.estimatedReplacementValueSelected ? <ValuationResults item={item} best={best} choose={choose}/> : tier==='free' ? <div className="locked"><LockKeyhole/><h3>Know what replacement may cost</h3><p>AssetVault Complete preview finds and saves comparable new, used, and refurbished listings. Manual values stay available on free demo access.</p><button className="primary" onClick={upgrade}>Preview AssetVault Complete</button></div> : <div className="empty"><Sparkles/><h3>No estimate yet</h3><p>Search mocked marketplace sources to build an approximate replacement range.</p></div>}
  <div className="actions"><button className="primary" disabled={tier==='free'||loading} onClick={find}>{loading?'Checking sources...':'Estimate replacement cost'}</button>{item.estimatedReplacementValueSelected&&<button onClick={()=>choose(item.estimatedReplacementValueSelected!)}>Use this value</button>}</div><div className="manual"><input aria-label="Manual value" type="number" value={manual} onChange={e=>setManual(e.target.value)} placeholder={item.userEnteredValue?`Manual value: ${money(item.userEnteredValue)}`:'Enter manual value'}/><button onClick={saveManual}>Add manual value</button></div><div className="checked">Checked: {dateTime(item.valuationCheckedAt)}{item.valuationSourceSummary&&` - ${item.valuationSourceSummary}`}</div><p className="disclaimer">{VALUATION_DISCLAIMER}</p></section></div><aside className="side"><section className="panel"><p className="eyebrow">VALUE SUMMARY</p><div className="bigvalue">{money(item.userEnteredValue)}</div><small>User-entered value</small><hr/><div className="bigvalue">{money(item.estimatedReplacementValueSelected)}</div><small>Value Assist</small></section><section className="panel"><p className="eyebrow">DOCUMENTATION</p><p>{item.photos.length} item photo</p><p>{item.serialPhotos.length+item.markingPhotos.length} identifier photos</p><p>{item.receiptFiles.length} receipt</p><p>{item.appraisalFiles.length} appraisal</p></section></aside></div></>}

function ValuationResults({item,best,choose}:{item:InventoryItem;best?:InventoryItem['comparableListings'][number];choose:(n:number)=>void}){return <><div className="estimate"><div><small>ESTIMATED REPLACEMENT RANGE</small><b>{money(item.estimatedReplacementValueLow)} - {money(item.estimatedReplacementValueHigh)}</b><span>Selected estimate: {money(item.estimatedReplacementValueSelected)}</span></div><div className={`confidence ${item.valuationConfidence}`}>{item.valuationConfidence} confidence</div></div>{best&&<><p className="eyebrow">BEST COMPARABLE</p><div className="comparable"><div><b>{best.title}</b><small>{best.marketplace} - {best.condition} - {best.matchReason}</small></div><strong>{money(best.price)}</strong><a href={best.url} target="_blank" rel="noreferrer" aria-label="Open comparable listing"><ExternalLink/></a></div></>}{item.comparableListings.slice(1).map(x=><div className="comparable minor" key={x.id}><div><b>{x.title}</b><small>{x.marketplace} - {x.condition}</small></div><strong>{money(x.price)}</strong><button className="textBtn" onClick={()=>choose(x.price)}>Use this value</button></div>)}</>}

function BrowserStoragePanel(){const[estimate,setEstimate]=useState<{usage?:number;quota?:number}>({});useEffect(()=>{let active=true;navigator.storage?.estimate?.().then(result=>{if(active)setEstimate({usage:result.usage,quota:result.quota})}).catch(()=>undefined);return()=>{active=false}},[]);const usage=estimate.usage??0;const quota=estimate.quota??0;const percent=quota?Math.min(100,Math.round((usage/quota)*100)):0;const mb=(bytes:number)=>(bytes/1024/1024).toFixed(bytes>10_000_000?1:2);return <section className="panel settings"><h2>Browser storage</h2><p>This web demo stores inventory, incidents, and uploaded evidence in this browser. For large real inventories, the mobile app will use app-private file storage instead.</p>{quota?<><div className="storageMeter" aria-label={`Browser storage ${percent}% used`}><span style={{width:`${percent}%`}}/></div><small>{mb(usage)} MB used of about {mb(quota)} MB available to this browser.</small></>:<small>Storage estimate is not available in this browser.</small>}</section>}

function SettingsView({items,locations,tier,plan,activation,trialPhotosRemaining,premiumAiAssistsRemaining,status,syncState,syncMessage,setPlan,updateActivation,restore,restoreCloud,resetDemoData}:{items:InventoryItem[];locations:LocationRecord[];tier:SubscriptionTier;plan:AssetVaultPlan;activation:AssetVaultActivation;trialPhotosRemaining:number;premiumAiAssistsRemaining:number;status:CloudStatus;syncState:'idle'|'loading'|'saving'|'saved'|'error';syncMessage:string;setPlan:(plan:AssetVaultPlan)=>void;updateActivation:(patch:Partial<AssetVaultActivation>)=>void;restore:(backup:AssetVaultBackup)=>boolean;restoreCloud:(snapshot:CloudSnapshot)=>boolean;resetDemoData:()=>void}){
  const[confirmReset,setConfirmReset]=useState(false);
  const usageText=tier==='premium'?`Your annual Premium plan includes ${premiumAiAssistLimit} photo analyses. You have used ${premiumAiAssistLimit-premiumAiAssistsRemaining}; ${premiumAiAssistsRemaining} remain in this annual cycle.`:`You have used ${trialPhotoLimit-trialPhotosRemaining} of ${trialPhotoLimit} free photo analyses. Each successful photo creates a suggested description, make/model/SN candidate, and approximate replacement estimate to review.`;
  return <><PageHead kicker="SETTINGS" title="Settings & privacy" sub="Manage account sync, local backups, privacy, security placeholders, and prototype feature access."/>
    <section className="panel settings accountModePanel"><h2>Current workspace</h2><p>{status.authenticated?`Signed in as ${status.email}. Inventory, incidents, locations, prototype access setting, and batch defaults autosave to this account.`:'Local demo mode. Data stays in this browser unless you sign in or export a backup.'}</p><span className={`syncPill ${syncState}`}>{status.authenticated?(syncMessage||'Autosave ready'):'Not syncing'}</span></section>
    <section className="panel settings"><h2>Photo analysis usage</h2><p>{usageText}</p><small>One photo analysis analyzes one overview photo. Premium will allow optional 100-analysis add-ons when billing is enabled.</small></section>
    <HouseholdAccessPanel status={status} tier={tier} onUpgrade={()=>setPlan('family')}/>
    <section className="panel settings"><h2>Prototype plan preview</h2><p>Select a plan to preview its intended access. This is stored only in this browser and does not collect payment.</p><label>AssetVault plan<select aria-label="AssetVault mock subscription plan" value={plan} onChange={event=>setPlan(event.target.value as AssetVaultPlan)}>{assetVaultPlans.map(option=><option key={option.id} value={option.id}>{option.name} — {option.price} {option.cadence}</option>)}</select></label><p><b>{planForId(plan).name}</b>: {planForId(plan).outcome} {tier==='premium' ? `This preview unlocks Value Assist, photo analysis, saved comparables, and premium Incident Packet evidence.` : 'Manual values and basic export remain available; Value Assist stays locked.'}</p></section>
    <CloudSyncPanel items={items} locations={locations} tier={tier} onRestoreCloud={restoreCloud}/><BrowserStoragePanel/><BackupPanel items={items} locations={locations} tier={tier} onRestore={restore}/><PartnerReferralPanel activation={activation} onChange={updateActivation}/>
    {!status.authenticated&&<section className="panel settings"><h2>Demo reset</h2><p>Use this before a walkthrough or when browser storage gets crowded. Download a backup first if you want to keep your current local records.</p>{confirmReset?<div className="restoreConfirm"><div><b>Reset this browser demo?</b><small>This replaces local inventory, incidents, locations, prototype access, saved photo drafts, batch defaults, and Try Before You Buy trial count with the original sample data.</small></div><button onClick={()=>setConfirmReset(false)}>Cancel</button><button className="dangerButton" onClick={resetDemoData}>Reset demo data</button></div>:<button className="dangerButton" onClick={()=>setConfirmReset(true)}>Reset demo data</button>}</section>}
    <PrivacySecurityPanel/><AboutPanel/>
  </>;
}
