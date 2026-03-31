import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, FlatList, Modal, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- Luokat ---
interface PatrolLog {
  id: string;
  point: string;
  time: string;
  coords: string;
  report?: {
    kategoria: string;
    kohde: string;
    toteama: string;
    toimenpide: string;
    lopputulos: string;
    lisatiedot: string;
  };
}
interface PatrolShift {
  id: string;
  startTime: string;
  endTime?: string;
  logs: PatrolLog[];
  status?: 'AKTIIVINEN' | 'LUKITTU';
  guardName?: string; 
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SecurityPatrolScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [shifts, setShifts] = useState<PatrolShift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [tempGuardName, setTempGuardName] = useState('');
  
  // Modalit
  const [modelVisible, setModalVisible] = useState(false);
  const [isShiftPickerOpen, setShiftPickerOpen] = useState(false);
  
  // Raportointitiedot
  const [currentScanData, setCurrentScanData] = useState('');
  const [step, setStep] = useState(1);
  const [report, setReport] = useState({
    kategoria: '', kohde: '', toteama: '', toimenpide: '', lopputulos: '', lisatiedot: ''
  });

  const cameraHeight = useRef(new Animated.Value(250)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = gestureState.moveY - 60;
        if (newHeight > 100 && newHeight < SCREEN_HEIGHT - 150) {
          cameraHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: () => {
      }
    })
  ).current;
  const clearAllShifts = async () => {
    Alert.alert("Tyhjennys", "Haluatko varmasti poistaa kaiken historian?", [
      { text: "Peruuta", style: "cancel" },
      { text: "Poista", style: "destructive", onPress: async () => {
          setShifts([]); 
          setActiveShiftId(null); 
          await AsyncStorage.removeItem('all_shifts');
      }}
    ]);
  };

  const activeShift = shifts.find(s => s.id === activeShiftId);
  const inspectionData = {
    categories: [
      { id: "palo", title: "Paloturvallisuus", options: ["Palo-ovi", "Hätäuloskäynti", "Alkusammutuskalusto"] },
      { id: "lukitukset", title: "Lukitukset", options: ["Ulko-ovi", "Sisäovi", "Porrasovi", "Ikkuna"] },
      { id: "kiinteisto", title: "Kiinteistö", options: ["Lämpö", "Vesi", "Ilmastointi", "Sähkö"] },
      { id: "henkilot", title: "Henkilöt", options: ["Luvallinen", "Luvaton", "Rikos", "Viranomainen"] }
    ],
    states: ["Avoin", "Rikki", "Puutteita", "Päällä", "Pois päältä"],
    actions: ["Tarkastettu", "Suljettu", "Poistettu", "Sammutettu", "Soitettu 112"],
    results: ["OK", "Ei ok"]
  };

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      await Location.requestForegroundPermissionsAsync();
      const savedData = await AsyncStorage.getItem('all_shifts');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setShifts(parsed);
        if (parsed.length > 0) setActiveShiftId(parsed[0].id);
      }
    })();
  }, []);

 const startNewShift = async () => {
  if (!tempGuardName.trim()) {
    Alert.alert("Huomio!", "Kirjoita vartijan nimi ennen uuden kierroksen aloittamista")
    return
  }
  if (tempGuardName.trim().length <2){
    Alert.alert("Nimi puuttuu", "Kirjoita vartijan nimi (vähintään 2 merkkiä")
    return
  }
  
  const now = new Date();
  const timeString = now.toLocaleString('fi-FI', { 
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
  
  // Luodaan uusi tyhjä kierros
  const newShift: PatrolShift = { 
    id: Date.now().toString(), 
    startTime: timeString, 
    logs: [],
    status: 'AKTIIVINEN',
    guardName: tempGuardName 
  };
  
  const updatedShifts = [newShift, ...shifts];
  setShifts(updatedShifts);
  setActiveShiftId(newShift.id);
  await AsyncStorage.setItem('all_shifts', JSON.stringify(updatedShifts));
  setTempGuardName('');
  Alert.alert("Kierros aloitettu", `Vartija: ${newShift.guardName}`);
};

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!activeShiftId) {
      setScanned(true);
      Alert.alert("Huomio", "Aloita ensin uusi kierros.", [{ text: "OK", onPress: () => setScanned(false) }]);
      return;
    }
    setScanned(true);
    setCurrentScanData(data);
    setStep(1);
    setReport({ kategoria: '', kohde: '', toteama: '', toimenpide: '', lopputulos: '', lisatiedot: '' });
    setModalVisible(true);
  };

const saveFinalReport = async () => {
  setModalVisible(false);
  setScanned(false);
  
  try {
    // Haetaan sijainti 
    let location = await Location.getLastKnownPositionAsync({});
    if (!location) {
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    }
    
    // Muotoillaan koordinaatit 
    const coordsString = location 
      ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
      : "Sijainti ei saatavilla";

    const newEntry: PatrolLog = {
      id: Date.now().toString(),
      point: currentScanData,
      time: new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' }),
      coords: coordsString,
      report: { ...report }
    };

    const currentShift = shifts.find(s => s.id === activeShiftId);
    const isLocked = currentShift?.status === 'LUKITTU';

    if (isLocked || !activeShiftId) {
      const now = new Date();
      const timeString = now.toLocaleString('fi-FI', { 
        weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      
      const newShift: PatrolShift = { 
        id: Date.now().toString(), 
        startTime: timeString, 
        logs: [newEntry],
        status: 'AKTIIVINEN',
        guardName: currentShift?.guardName || tempGuardName 
      };
      
      const finalShifts = [newShift, ...shifts];
      setShifts(finalShifts);
      setActiveShiftId(newShift.id);
      await AsyncStorage.setItem('all_shifts', JSON.stringify(finalShifts));
      
    } else {
      const updatedShifts = shifts.map(s => 
        s.id === activeShiftId ? { ...s, logs: [newEntry, ...s.logs] } : s
      );
      setShifts(updatedShifts);
      await AsyncStorage.setItem('all_shifts', JSON.stringify(updatedShifts));
    }
  } catch (err) {
    console.error("Optimointivirhe tallennuksessa:", err);
  }
};

  const deleteLogItem = (logId: string) => {
    const updated = shifts.map(s => s.id === activeShiftId ? { ...s, logs: s.logs.filter(l => l.id !== logId) } : s);
    setShifts(updated);
    AsyncStorage.setItem('all_shifts', JSON.stringify(updated));
  };

  const renderOptions = (items: string[], field: string, nextStep: number) => (
    <View style={styles.optionGrid}>
      {items.map(item => (
        <TouchableOpacity 
          key={item} 
          style={styles.optionButton} 
          onPress={() => { setReport({...report, [field]: item}); setStep(nextStep); }}
        >
          <Text style={styles.optionText}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aluevalvonnan Seuranta</Text>
      </View>
      <Animated.View style={{ height: cameraHeight }}>
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <View style={styles.viewfinder} />
        </CameraView>
      </Animated.View>
      <View style={styles.logSection}>
  <FlatList
    data={activeShift ? activeShift.logs : []}
    keyExtractor={item => item.id}
    ListHeaderComponent={
      <>
        <View style={styles.dragHandle} {...panResponder.panHandlers}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.controlPanel}>
  <Text style={styles.sectionTitle}>Kierroksen hallinta</Text>
  
  <View style={styles.inputRow}>
    <TextInput
      style={styles.nameInputInline}
      placeholder="Kirjoita vartijan nimi..."
      placeholderTextColor="#999"
      value={tempGuardName}
      onChangeText={setTempGuardName}
    />
    <TouchableOpacity style={styles.newShiftButton} onPress={startNewShift}>
      <Text style={styles.newShiftButtonText}>+ ALOITA</Text>
    </TouchableOpacity>
  </View>
  
  {/* Ohjeteksti, joka näkyy vain jos nimeä ei ole vielä kirjoitettu */}
  {!tempGuardName && (
    <Text style={styles.hintText}>Syötä nimi aloittaaksesi uuden kierroksen</Text>
  )}
</View>

        <TouchableOpacity style={styles.activeShiftBox} onPress={() => setShiftPickerOpen(true)}>
          <View>
            <Text style={styles.label}>VALITTU KIERROS:</Text>
            <Text style={styles.activeShiftText}>{activeShift ? ` ${activeShift.startTime}` : "Valitse kierros"}</Text>
          </View>
          <Text style={{color: '#007AFF', fontWeight: 'bold'}}>MUUTA ▲</Text>
        </TouchableOpacity>
        <Text style={styles.listTitle}>Raportit:</Text>
      </>
    }
    renderItem={({ item }) => (
      <View style={styles.logItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logPoint}>{item.point} - {item.report?.kohde}</Text>
          <Text style={styles.logCoords}>
            {item.report?.toteama} {"->"} {item.report?.toimenpide}
          </Text>
          <Text style={styles.logTime}>{item.time} | {item.report?.lopputulos}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteLogItem(item.id)} style={styles.deleteButton}>
          <Text style={{color: 'red'}}>✕</Text>
        </TouchableOpacity>
      </View>
    )}
    ListFooterComponent={
      shifts.length > 0 ? (
        <View style={{ paddingBottom: 60 }}>
          <TouchableOpacity style={styles.devtyhjenna} onPress={clearAllShifts}>
            <Text style={styles.devButtonText}>TYHJENNÄ HISTORIA</Text>
          </TouchableOpacity>
        </View>
      ) : null
    }
    contentContainerStyle={{ paddingBottom: 50 }}
  />
</View>
      <Modal visible={isShiftPickerOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Valitse kierros</Text>
          <FlatList
            data={shifts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.dropdownItem} 
                onPress={() => { setActiveShiftId(item.id); setShiftPickerOpen(false); }}
              >
                <Text>{item.startTime}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => setShiftPickerOpen(false)} style={styles.closeButton}><Text style={{color:'white'}}>Sulje</Text></TouchableOpacity>
        </View>
      </Modal>

      <Modal 
  visible={modelVisible} 
  animationType="slide"
  onRequestClose={() => { setModalVisible(false); setScanned(false); setStep(1); }}
>
  <View style={styles.modalContainer}>
    <ScrollView>
      <Text style={styles.modalTitle}>Skanattu: {currentScanData}</Text>
      
      {/* VAIHE 1: Kategoria */}
      {step === 1 && inspectionData.categories.map(cat => (
        <TouchableOpacity 
          key={cat.id} 
          style={styles.optionButton} 
          onPress={() => { setReport({...report, kategoria: cat.title}); setStep(2); }}
        >
          <Text style={styles.optionText}>{cat.title}</Text>
        </TouchableOpacity>
      ))}

      {/* VAIHE 2: Kohde  */}
      {step === 2 && (
        <View>
          <Text style={styles.stepTitle}>2. Kohde ({report.kategoria})</Text>
          {renderOptions(
            inspectionData.categories.find(c => c.title === report.kategoria)?.options || [], 
            'kohde', 
            3
          )}
        </View>
      )}

      {/* VAIHE 3: Toteama  */}
      {step === 3 && (
        <View>
          <Text style={styles.stepTitle}>3. Toteama</Text>
          {renderOptions(inspectionData.states, 'toteama', 4)}
        </View>
      )}

      {/* VAIHE 4: Toimenpide  */}
      {step === 4 && (
        <View>
          <Text style={styles.stepTitle}>4. Toimenpide</Text>
          {renderOptions(inspectionData.actions, 'toimenpide', 5)}
        </View>
      )}

      {/* VAIHE 5: Lopputulos  */}
      {step === 5 && (
        <View>
          <Text style={styles.stepTitle}>5. Lopputulos</Text>
          {renderOptions(inspectionData.results, 'lopputulos', 6)}
        </View>
      )}

      {/* VAIHE 6: Lisätiedot ja tallennus */}
      {step === 6 && (
        <View>
          <Text style={styles.stepTitle}>6. Lisätiedot</Text>
          <TextInput 
            style={styles.modalInput} 
            multiline 
            placeholder="Vapaa teksti..." 
            onChangeText={t => setReport({...report, lisatiedot: t})} 
          />
          <TouchableOpacity style={styles.saveButton} onPress={saveFinalReport}>
            <Text style={{color:'white', textAlign:'center', fontWeight:'bold'}}>TALLENNA RAPORTTI</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    {/* PERUUTUS / TAKAISIN -NAPPI */}
    <TouchableOpacity 
      onPress={() => {
        if (step > 1) {
          setStep(step - 1);
        } else {
          setModalVisible(false);
          setScanned(false);
          setStep(1);
        }
      }} 
      style={styles.modalCancel}
    >
      <Text style={{color: 'red', fontWeight: 'bold'}}>
        {step > 1 ? "← Takaisin" : "Peruuta"}
      </Text>
    </TouchableOpacity>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { paddingTop: 50, paddingBottom: 15, alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  viewfinder: { flex: 1, borderStyle: 'solid', borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', margin: 40 },
  logSection: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, marginTop: -20 },
  dragHandle: { width: '100%', height: 40, alignItems: 'center', justifyContent: 'center' },
  handleBar: { width: 45, height: 6, backgroundColor: '#ddd', borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  newShiftButton: { backgroundColor: '#007AFF', padding: 8, borderRadius: 5 },
  newShiftButtonText: { color: 'white', fontWeight: 'bold' },
  activeShiftBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#007AFF', marginHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, color: '#007AFF', fontWeight: 'bold' },
  activeShiftText: { fontSize: 14, fontWeight: 'bold' },
  listTitle: { marginTop: 15, paddingHorizontal: 15, fontSize: 14, fontWeight: 'bold', color: '#555' },
  logItem: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginHorizontal: 15, marginBottom: 10, flexDirection: 'row', elevation: 2, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  logPoint: { fontWeight: 'bold' },
  logCoords: { fontSize: 12, color: '#666' },
  logTime: { fontSize: 11, color: '#007AFF', fontWeight: 'bold' },
  stepTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#007AFF',marginTop: 10 },
  deleteButton: { padding: 5 },
  modalContainer: { flex: 1, padding: 25, paddingTop: 60, backgroundColor: 'white' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  optionButton: { width: '48%', backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, marginBottom: 10 },
  optionText: { textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, height: 100 },
  saveButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, marginTop: 20 },
  closeButton: { backgroundColor: '#666', padding: 15, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalCancel: { marginTop: 20, alignSelf: 'center' },
  devtyhjenna: { marginTop: 20, marginHorizontal: 15,padding: 15, borderRadius: 10, backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#ffcccc',alignItems: 'center' },
  devButtonText: { color: '#cc0000', fontWeight: 'bold', fontSize: 12 },
  controlPanel: {paddingHorizontal: 15,paddingVertical: 10,backgroundColor: '#fff',},
  inputRow: {flexDirection: 'row',alignItems: 'center',marginTop: 10,gap: 10, },
  nameInputInline: {flex: 1,backgroundColor: '#f2f2f2',borderRadius: 8,paddingHorizontal: 12,paddingVertical: 10,borderWidth: 1,borderColor: '#ddd',fontSize: 16,color: '#333',},
  hintText: {fontSize: 11,color: '#007AFF',marginTop: 5,fontStyle: 'italic',},
  });