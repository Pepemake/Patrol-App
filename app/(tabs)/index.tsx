import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Alert, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface PatrolLog {
  id: string;
  point: string;
  time: string;
  coords: string;
}
interface PatrolShift {
  id: string;
  startTime: string;
  endTime?: string; 
  logs: PatrolLog[];
}

export default function SecurityPatrolScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  
  // --- UUSI VUOROPOHJAINEN HALLINTA ---
  const [shifts, setShifts] = useState<PatrolShift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  
  const listHeight = React.useRef(new Animated.Value(300)).current;
  const lastScannedTime = useRef<number>(0);
  const ajastin = 10000;

  // Haetaan aktiivinen vuoro datan näyttämistä varten
  const activeShift = shifts.find(s => s.id === activeShiftId);

  // --- VUORON ALOITUS ---
  const startNewShift = async () => {
    const now = new Date();
    const timeString = now.toLocaleString('fi-FI', { 
      weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const newShift: PatrolShift = {
      id: Date.now().toString(),
      startTime: timeString,
      logs: []
    };

    const updatedShifts = [newShift, ...shifts];
    setShifts(updatedShifts);
    setActiveShiftId(newShift.id);
    
    // Tallennetaan kaikki vuorot yhteen paikkaan
    await AsyncStorage.setItem('all_shifts', JSON.stringify(updatedShifts));
  };

  // --- YKSITTÄISEN MERKINNÄN POISTO ---
  const deleteLogItem = (logId: string) => {
    if (!activeShiftId) return;

    Alert.alert(
      "Poistetaanko merkintä?",
      "Haluatko varmasti poistaa tämän lokitapahtuman?",
      [
        { text: "Peruuta", style: "cancel" },
        {
          text: "Poista",
          style: "destructive",
          onPress: async () => {
            const updatedShifts = shifts.map(shift => {
              if (shift.id === activeShiftId) {
                return { ...shift, logs: shift.logs.filter(l => l.id !== logId) };
              }
              return shift;
            });
            setShifts(updatedShifts);
            await AsyncStorage.setItem('all_shifts', JSON.stringify(updatedShifts));
          }
        }
      ]
    );
  };

  // --- Historian tyhjennys ---
  const clearAllShifts = () => {
    Alert.alert(
      "Tyhjennetäänkö kaikki?",
      "Tämä poistaa kaikki vuorot ja niiden kirjaukset pysyvästi.",
      [
        { text: "Peruuta", style: "cancel" },
        { 
          text: "Tyhjennä", 
          style: "destructive", 
          onPress: async () => {
            setShifts([]);
            setActiveShiftId(null);
            await AsyncStorage.removeItem('all_shifts');
          } 
        }
      ]
    );
  };

  // PanResponder-logiikka pysyy samana...
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = 300 - gestureState.dy;
        if (newHeight > 150 && newHeight < 600) {
          listHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

// --- Ladataan tallennetut tiedot ja pyydetään luvat kameraan ja GPS ---
  useEffect(() => {
    (async () => {
      // Pyydetään Kamera oikeude.
      if (!cameraPermission || !cameraPermission.granted) {
        await requestCameraPermission();
      }
      // Pyydetään GPS-oikeudet
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      // Ladataan tallennettu data
      try {
        const savedData = await AsyncStorage.getItem('all_shifts');
        
        if (savedData !== null) {
          const parsedShifts = JSON.parse(savedData);
          setShifts(parsedShifts);
          if (parsedShifts.length > 0) {
            setActiveShiftId(parsedShifts[0].id);
          }
        }
      } catch (e) {
        console.log("Virhe tietoja ladattaessa:", e);
      }
    })();
  }, []);
// --- QR Koodin logiikka ---
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    const now = Date.now();
    if (!activeShiftId) {
    setScanned(true); 
    Alert.alert(
      "Vuoro puuttuu", 
      "Aloita ensin uusi vuoro yläreunan painikkeesta.",
      [{ text: "Selvä", onPress: () => setScanned(false) }] 
    );
    return;
  }
    if (!activeShiftId) {
      Alert.alert("Huomio", "Valitse tai aloita vuoro ennen skannausta.");
      return;
    }

    lastScannedTime.current = now; 
    setScanned(true);

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newEntry: PatrolLog = {
        id: Date.now().toString(),
        point: data,
        time: new Date().toLocaleTimeString('fi-FI'),
        coords: `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
      };

      const updatedShifts = shifts.map(shift => {
        if (shift.id === activeShiftId) {
          return { ...shift, logs: [newEntry, ...shift.logs] };
        }
        return shift;
      });

      setShifts(updatedShifts);
      await AsyncStorage.setItem('all_shifts', JSON.stringify(updatedShifts));

      Alert.alert(
        "Piste kirjattu", 
        `Kohde: ${data}`, 
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    } catch (error) {
      Alert.alert("Virhe", "Sijainti epäonnistui.");
      setScanned(false);
    }
  };
 // --- LUPAOIKEUDET JA LATAUSRUUDUT ---
  if (!cameraPermission || locationPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Käynnistetään järjestelmää...</Text>
      </View>
    );
  }
  if (locationPermission === false || !cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Pääsy estetty. Salli kamera ja GPS-paikannus puhelimen asetuksista jatkaaksesi.
        </Text>
      </View>
    );
  }
{/* --- KÄYTTÖLIITTYMÄ ---*/}
return (
  <View style={styles.container}>
    {/* Yläpalkki */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Aluevalvonnan Seuranta</Text>
      <Text style={styles.headerStatus}>
        GPS: {locationPermission ? 'KÄYTÖSSÄ' : 'EI KÄYTÖSSÄ'}
      </Text>
    </View>

    {/* Skanneri - Täyttää taustan */}
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.viewfinder} />
      </CameraView>
    </View>

{/* "Slideri" eli vetopalkki ja lokilista */}
<Animated.View style={[styles.logSection, { height: listHeight }]}>
      {/* 1. VETOKAHVA (Slider) */}
      <View {...panResponder.panHandlers} style={styles.dragHandle}>
        <View style={styles.handleBar} />
      </View>

      {/* 2. OTSIKKO JA UUSI VUORO -NAPPI */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>
          {activeShift ? `Kierros: ${activeShift.startTime}` : "Ei aloitettua kierrosta"}
        </Text>
        <TouchableOpacity 
          style={styles.newShiftButton} 
          onPress={startNewShift}
          activeOpacity={0.7}
        >
          <Text style={styles.newShiftButtonText}>+ UUSI</Text>
        </TouchableOpacity>
      </View>
     {/* 3. VUORON VALINTAMENU (Vaakasuuntainen lista) */}
      <View style={{ marginBottom: 15, height: 45 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={shifts}
          keyExtractor={(item) => item.id}
          // --- OPTIMOINTI ---
          initialNumToRender={7}
          removeClippedSubviews={true}
          // ------------------
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.shiftTab, 
                activeShiftId === item.id && styles.activeShiftTab
              ]} 
              onPress={() => setActiveShiftId(item.id)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.shiftTabText, 
                activeShiftId === item.id && styles.activeShiftTabText
              ]}>
                {item.startTime}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {/* 4. LOKILISTA (Valitun vuoron tapahtumat) */}
      <FlatList
        data={activeShift ? activeShift.logs : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }} 
        initialNumToRender={10}    
        windowSize={5}             
        maxToRenderPerBatch={5}    
        removeClippedSubviews={true}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.logPoint}>{item.point}</Text>
              <Text style={styles.logCoords}>Koordinaatit: {item.coords}</Text>
              <Text style={styles.logTime}>{item.time}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => deleteLogItem(item.id)}
              style={styles.deleteItemButton}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteItemText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={styles.emptyText}>
              {activeShiftId ? "Ei tallennettuja pisteitä tällä vuorolla." : "Aloita uusi vuoro skannataksesi."}
            </Text>
          </View>
        }
      />
      {/* 5. TYHJENNÄ HISTORIA -NAPPI */}
      <TouchableOpacity 
        style={styles.devtyhjenna} 
        onPress={clearAllShifts}
        activeOpacity={0.7}
      >
        <Text style={styles.devButtonText}>TYHJENNÄ KAIKKI HISTORIA</Text>
      </TouchableOpacity>
    </Animated.View>
    </View>
    ); 
    }


const styles = StyleSheet.create({
  // Pääkontti
  container: { 
    flex: 1, 
    backgroundColor: '#f0f0f0' 
  },

  // Yläpalkki ja otsikot 
  header: { 
    width: '100%',
    paddingTop: 60,
    paddingBottom: 20, 
    paddingHorizontal: 25, 
    backgroundColor: '#0d1b2a', 
    alignItems: 'flex-start', 
    justifyContent: 'center',
  },
  headerTitle: { 
    color: '#e0e1dd', 
    fontSize: 24,         
    fontWeight: 'bold', 
    letterSpacing: 1,
    textAlign: 'left',   
    width: '100%',
  },
  headerStatus: { 
    color: '#4caf50', 
    marginTop: 5, 
    fontSize: 14, 
    fontWeight: '600',
    textAlign: 'left', 
  },

  // Kamera 
  cameraContainer: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  camera: { 
    flex: 1 
  },
  viewfinder: { 
    flex: 1, 
    borderStyle: 'solid', 
    borderRadius: 10, 
    borderWidth: 2, 
    borderColor: 'rgba(255,255,255,0.5)', 
    margin: 70 
  },

  // Vedettävän listan kahva (Drag Handle)
  dragHandle: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: "#0818ff",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#213bcf',
    borderRadius: 3,
  },

  // Historia
  logSection: { 
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1b263b', 
    marginBottom: 15,
    marginTop: 5 
  },
  logItem: { 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 8, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8,
    borderLeftWidth: 4, 
    borderLeftColor: '#007AFF', 
    elevation: 2 
  },
  logPoint: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    color: '#1b263b' 
  },
  logCoords: { 
    fontSize: 11, 
    color: '#778da9', 
    marginTop: 4 
  },
  logTime: { 
    color: '#007AFF', 
    fontWeight: '600', 
    fontSize: 12 
  },

  // Ilmoitustekstit
  emptyText: { textAlign: 'center', marginTop: 30, color: '#778da9' },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 16, color: '#1b263b' },
  errorText: { textAlign: 'center', marginTop: 100, color: 'red', padding: 20 },

  devtyhjenna: {
    alignSelf: 'center',
    backgroundColor: '#e63946', 
    paddingVertical: 10,  
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,      
    marginBottom: 1,   
    elevation: 5,       
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10, 
  },
  devButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  deleteItemButton: {
    backgroundColor: '#f1f1f1',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteItemText: {
    color: '#e63946',
    fontSize: 18,
    fontWeight: 'bold',
  },
shiftTab: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeShiftTab: {
    backgroundColor: '#007AFF', 
    borderColor: '#007AFF',
  },
  shiftTabText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  activeShiftTabText: {
    color: 'white', 
    fontWeight: 'bold',
  },
  newShiftButton: {
    backgroundColor: '#0011ff', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  newShiftButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});