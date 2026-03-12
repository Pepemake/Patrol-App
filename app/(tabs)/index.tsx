import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PatrolLog {
  id: string;
  point: string;
  time: string;
  coords: string;
}

export default function SecurityPatrolScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [logs, setLogs] = useState<PatrolLog[]>([]);

// --- Ladataan tallennetut tiedot ja pyydetään luvat kameraan ja GPS ---
  useEffect(() => {
    (async () => {
      // Kamera Oikeudet
      if (!cameraPermission || !cameraPermission.granted) {
        await requestCameraPermission();
      }

      // GPS oikeudet
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');

      // Ladataan vanhemmat lokit
      try {
        const savedData = await AsyncStorage.getItem('patrol_history');
        if (savedData !== null) {
          setLogs(JSON.parse(savedData));
        }
      } catch (e) {
        console.log("Virhe tietoja ladattaessa");
      }
    })();
  }, []);
// --- QR Koodin logiikka ---
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setScanned(true); // Skanneri pauselle skannauksen ajaksi

    try {
      // Hae GPS Data puhelimelta
      const location = await Location.getCurrentPositionAsync({});

      // Luodaan uusi kohde-olio
      const newEntry: PatrolLog = {
        id: Date.now().toString(),
        point: data,
        time: new Date().toLocaleTimeString(),
        coords: `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`
      };

      // Päivitetään lista ja siirretään uusin loki ylös
      const updatedLogs = [newEntry, ...logs];
      setLogs(updatedLogs);

      // Tallennetaan lista puhelimen muistiin 
      await AsyncStorage.setItem('patrol_history', JSON.stringify(updatedLogs));

      // Ilmoitus vartijalle onnistuneesta kirjauksesta
      Alert.alert(
        "Piste kirjattu", 
        `Kohde: ${data}\nKellonaika: ${newEntry.time}`, 
        [{ text: "Jatka kierrosta", onPress: () => setScanned(false) }]
      );
    } catch (error) {
      Alert.alert("Virhe", "GPS-paikannus epäonnistui.");
      setScanned(false);
    }
  };



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  header: { padding: 60, backgroundColor: '#0d1b2a', alignItems: 'center' },
  headerTitle: { color: '#e0e1dd', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  headerStatus: { color: '#4caf50', marginTop: 8, fontSize: 12 },
  scannerContainer: { height: 280, backgroundColor: 'black' },
  camera: { flex: 1 },
  viewfinder: { 
    flex: 1, borderStyle: 'solid', borderRadius: 10, 
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', margin: 70 
  },
  logSection: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1b263b', marginBottom: 15 },
  logItem: { 
    backgroundColor: 'white', padding: 12, borderRadius: 8, 
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: '#007AFF', 
    elevation: 3 
  },
  logPoint: { fontWeight: 'bold', fontSize: 15, color: '#1b263b' },
  logCoords: { fontSize: 11, color: '#778da9', marginTop: 4 },
  logTime: { color: '#007AFF', fontWeight: '600', fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#778da9' },
  loadingText: { textAlign: 'center', marginTop: 100, fontSize: 16, color: '#1b263b' },
  errorText: { textAlign: 'center', marginTop: 100, color: 'red', padding: 20 }
});