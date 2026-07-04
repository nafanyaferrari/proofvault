import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { completenessScore, money, valuationService, VALUATION_DISCLAIMER, type InventoryItem, type ValuationResult } from '@proofvault/domain';
import { getLatestValuation, initializeDatabase, listInventory, saveItemPhoto, saveValuation } from './src/db/inventoryRepository';
import { chooseItemPhoto, takeItemPhoto } from './src/services/photoService';

const dbPromise = SQLite.openDatabaseAsync('proofvault.db');

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<InventoryItem>();
  const [valuation, setValuation] = useState<ValuationResult>();
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const db = await dbPromise;
    await initializeDatabase(db);
    setItems(await listInventory(db));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function openItem(item: InventoryItem) {
    const db = await dbPromise;
    setSelected(await getLatestValuation(db, item));
    setSaved(false);
  }
  async function findValues() {
    if (!selected) return;
    setFinding(true);
    setValuation(await valuationService.findComparableValues(selected));
    setFinding(false);
  }
  async function useValue() {
    if (!selected || !valuation) return;
    const db = await dbPromise;
    await saveValuation(db, selected.id, valuation);
    setSelected(await getLatestValuation(db, selected));
    setSaved(true);
  }
  async function addPhoto(source: 'camera' | 'library') {
    if (!selected) return;
    try {
      const photo = source === 'camera' ? await takeItemPhoto() : await chooseItemPhoto();
      if (!photo) return;
      const db = await dbPromise;
      await saveItemPhoto(db, selected.id, photo.uri, photo.mimeType, photo.originalName);
      setSelected(await getLatestValuation(db, selected));
    } catch (error) {
      Alert.alert('Could not add photo', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color="#5dd6ad" /><Text style={styles.muted}>Opening your private vault…</Text></SafeAreaView>;
  if (!selected) return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.brand}>PROOFVAULT</Text><Text style={styles.title}>Your inventory</Text><Text style={styles.muted}>Stored locally on this device.</Text>
    {items.map(item => <Pressable accessibilityRole="button" key={item.id} style={styles.card} onPress={() => void openItem(item)}><Text style={styles.cardTitle}>{item.itemName}</Text><Text style={styles.muted}>{item.category} · {item.location}</Text><Text style={styles.value}>{money(item.userEnteredValue)}</Text></Pressable>)}
  </ScrollView></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" onPress={() => { setSelected(undefined); setValuation(undefined); }}><Text style={styles.back}>‹ Inventory</Text></Pressable>
    <Text style={styles.eyebrow}>{selected.category} · {selected.location}</Text><Text style={styles.title}>{selected.itemName}</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>Item photos</Text>
      {selected.photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>{selected.photos.map(uri => <Image key={uri} source={{ uri }} style={styles.photo} accessibilityLabel="Item evidence photo" />)}</ScrollView> : <Text style={styles.muted}>No item photos yet.</Text>}
      <View style={styles.actionRow}><Pressable accessibilityRole="button" style={styles.smallButton} onPress={() => void addPhoto('camera')}><Text style={styles.buttonText}>Take photo</Text></Pressable><Pressable accessibilityRole="button" style={styles.smallOutlineButton} onPress={() => void addPhoto('library')}><Text style={styles.secondaryButtonText}>Choose photo</Text></Pressable></View>
      <Text style={styles.disclaimer}>Photos are copied into ProofVault’s private app documents folder and referenced by the local database.</Text>
    </View>
    <View style={styles.card}><Text style={styles.cardTitle}>Item record</Text><Text style={styles.value}>{[selected.make, selected.model].filter(Boolean).join(' ')}</Text><Text style={styles.muted}>Serial: {selected.serialNumber || 'Not recorded'}</Text><Text style={styles.score}>{completenessScore(selected).score}% complete</Text></View>
    <View style={styles.premiumCard}><Text style={styles.pill}>PREMIUM</Text><Text style={styles.cardTitle}>Replacement Value Assist</Text>
      {valuation ? <><Text style={styles.range}>{money(valuation.estimatedReplacementValueLow)}–{money(valuation.estimatedReplacementValueHigh)}</Text><Text style={styles.value}>{valuation.confidence.toUpperCase()} confidence</Text>{valuation.comparableListings.map(listing => <View key={listing.id} style={styles.listing}><Text style={styles.value}>{listing.title}</Text><Text style={styles.muted}>{listing.marketplace} · {listing.condition} · {money(listing.price)}</Text></View>)}<Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => void useValue()}><Text style={styles.secondaryButtonText}>{saved ? 'Value saved on this device' : `Use ${money(valuation.suggestedReplacementValue)}`}</Text></Pressable></> : selected.estimatedReplacementValueSelected ? <><Text style={styles.range}>{money(selected.estimatedReplacementValueLow)}–{money(selected.estimatedReplacementValueHigh)}</Text><Text style={styles.value}>Saved value: {money(selected.estimatedReplacementValueSelected)} · {selected.valuationConfidence?.toUpperCase()} confidence</Text>{selected.comparableListings.map(listing => <View key={listing.id} style={styles.listing}><Text style={styles.value}>{listing.title}</Text><Text style={styles.muted}>{listing.marketplace} · {listing.condition} · {money(listing.price)}</Text></View>)}</> : <Text style={styles.muted}>Estimate replacement cost using mock comparable marketplace listings.</Text>}
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => void findValues()} disabled={finding}><Text style={styles.buttonText}>{finding ? 'Finding comparables…' : 'Find Comparable Values'}</Text></Pressable>
      <Text style={styles.disclaimer}>{VALUATION_DISCLAIMER}</Text>
    </View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#07110f'}, center:{flex:1,backgroundColor:'#07110f',alignItems:'center',justifyContent:'center',gap:12}, page:{padding:22,gap:14},
  brand:{color:'#5dd6ad',fontSize:12,fontWeight:'800',letterSpacing:2}, eyebrow:{color:'#8da39d',fontSize:12,textTransform:'uppercase'}, title:{color:'#f2faf7',fontSize:30,fontWeight:'800'}, back:{color:'#5dd6ad',fontSize:17},
  card:{backgroundColor:'#10201c',borderColor:'#203b34',borderWidth:1,borderRadius:16,padding:18,gap:9}, premiumCard:{backgroundColor:'#11251e',borderColor:'#4fb991',borderWidth:1,borderRadius:18,padding:18,gap:12}, cardTitle:{color:'#f2faf7',fontSize:19,fontWeight:'700'}, value:{color:'#dbe9e4',fontSize:15}, muted:{color:'#8da39d',fontSize:14}, score:{color:'#5dd6ad',fontWeight:'700',marginTop:5},
  pill:{alignSelf:'flex-start',color:'#07110f',backgroundColor:'#e7b85b',paddingHorizontal:9,paddingVertical:4,borderRadius:99,fontSize:10,fontWeight:'900'}, range:{color:'#f2faf7',fontSize:27,fontWeight:'800'}, listing:{borderTopColor:'#29473e',borderTopWidth:1,paddingTop:10,gap:3},
  button:{backgroundColor:'#5dd6ad',borderRadius:12,padding:14,alignItems:'center',marginTop:4}, buttonText:{color:'#07110f',fontWeight:'800'}, secondaryButton:{borderColor:'#5dd6ad',borderWidth:1,borderRadius:12,padding:13,alignItems:'center'}, secondaryButtonText:{color:'#5dd6ad',fontWeight:'800'},
  photoRow:{gap:10}, photo:{width:150,height:112,borderRadius:10,backgroundColor:'#07110f'}, actionRow:{flexDirection:'row',gap:9}, smallButton:{flex:1,backgroundColor:'#5dd6ad',borderRadius:10,padding:11,alignItems:'center'}, smallOutlineButton:{flex:1,borderColor:'#5dd6ad',borderWidth:1,borderRadius:10,padding:10,alignItems:'center'}, disclaimer:{color:'#82968f',fontSize:11,lineHeight:16},
});
