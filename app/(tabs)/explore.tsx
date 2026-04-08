import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { useFocusEffect } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';

export default function ReportingScreen() {
  const [shifts, setShifts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadReports = async () => {
        try {
          const savedData = await AsyncStorage.getItem('all_shifts');
          if (savedData) {
            const parsed = JSON.parse(savedData);
            setShifts(parsed);
            console.log("Raportit ladattu:", parsed[0]?.logs.length, "kpl");
          }
        } catch (e) {
          console.error("Latausvirhe", e);
        }
      };

      loadReports();
    }, [])
  );

  const activeShift = shifts[0];

  const archiveCurrentShift = async () => {
  try {
    const savedData = await AsyncStorage.getItem('all_shifts');
    let allShifts = savedData ? JSON.parse(savedData) : [];

    if (allShifts.length > 0) {
      // Merkitään uusin kierros päättyneeksi
      allShifts[0].endTime = new Date().toLocaleString('fi-FI');
      allShifts[0].status = 'LUKITTU';

      // Tallennetaan takaisin
      await AsyncStorage.setItem('all_shifts', JSON.stringify(allShifts));
      
      // Tyhjennetään näkymä (aloittaa uuden kierroksen seuraavalla skannauksella)
      setShifts(allShifts); 
      Alert.alert("Arkistoitu", "Kierros on lukittu. Seuraava skannaus aloittaa uuden raportin.");
    }
  } catch (e) {
    console.error("Arkistointivirhe", e);
  }
};

  // --- SHARE-MEKANISMI ---
  const handleSendReport = async () => {
    if (!activeShift || activeShift.logs.length === 0) {
      Alert.alert("Huom!", "Ei lähetettävää dataa.");
      return;
    }

    try {
      // 1. Luodaan HTML-sisältö PDF:ää varten
      const htmlContent = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
        h1 { color: #007AFF; text-align: center; border-bottom: 2px solid #007AFF; padding-bottom: 10px; }
        .header-info { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
        .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-left: 6px solid #007AFF; page-break-inside: avoid; }
        .point-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-bottom: 10px; }
        .coords-label { font-size: 11px; color: #777; font-family: monospace; margin-top: 5px; display: block; }
        .status-ok { color: #2ecc71; font-weight: bold; }
        .status-error { color: #e74c3c; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #aaa; }
      </style>
    </head>
    <body>
      <h1>VARTIOINTIRAPORTTI</h1>
      <div class="header-info">
        <p><b>Vartija:</b> ${activeShift.vartijanNimi || 'Ei ilmoitettu'}</p>
        <p><b>Kierros aloitettu:</b> ${activeShift.startTime}</p>
        <p><b>Raportti generoitu:</b> ${new Date().toLocaleString('fi-FI')}</p>
      </div>

      ${activeShift.logs.map((log: any) => `
        <div class="card">
          <div class="point-header">
            <span>📍 ${log.point}</span>
            <span style="color: #666;">${log.time}</span>
          </div>
          
          <p><b>Kohde:</b> ${log.report?.kategoria} / ${log.report?.kohde}</p>
          <p><b>Tila:</b> <span class="${log.report?.lopputulos === 'OK' ? 'status-ok' : 'status-error'}">
            ${log.report?.toteama} (${log.report?.lopputulos})
          </span></p>
          <p><b>Toimenpide:</b> ${log.report?.toimenpide}</p>
          
          ${log.report?.lisatiedot ? `<p><b>Lisätiedot:</b> <i>${log.report.lisatiedot}</i></p>` : ''}
          
          <span class="coords-label">GPS-Sijainti: ${log.coords || 'Ei saatavilla'}</span>
        </div>
      `).join('')}

      <div class="footer">
        <p>Generoinut Alva Aluevalvonta -sovellus</p>
        <p>Tämä raportti on digitaalisesti varmennettu GPS-koordinaateilla.</p>
      </div>
    </body>
  </html>
`;

      // 2. Tulostetaan HTML -> PDF väliaikaiseen tiedostoon
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

    // Avataan jako
    await shareAsync(uri, { 
      mimeType: 'application/pdf', 
      dialogTitle: 'Lähetä raportti',
      UTI: 'com.adobe.pdf' 
    });

    // --- LUKITSEMISLOGIIKKA  ---
    Alert.alert(
      "Raportti lähetetty",
      "Haluatko lukita tämän kierroksen ja aloittaa uuden?",
      [
        { text: "Jätä auki", style: "cancel" },
        { 
          text: "Lukitse ja Arkistoi", 
          onPress: async () => {
            await archiveCurrentShift();
          },
          style: "destructive"
        }
      ]
    );
  } catch (error) {
    Alert.alert("Virhe", "Lähetys epäonnistui.");
  }
};

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={<Ionicons size={250} name="clipboard" style={styles.headerImage} color="rgba(255,255,255,0.2)" />}>
      
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Raportointi</ThemedText>
      </ThemedView>

      <TouchableOpacity style={styles.sendButton} onPress={handleSendReport}>
        <Ionicons name="mail-outline" size={24} color="white" />
        <ThemedText style={styles.sendButtonText}>LÄHETÄ OPETTAJALLE (PDF)</ThemedText>
      </TouchableOpacity>      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: { bottom: -50, left: -20, position: 'absolute', zIndex: -1 },
  titleContainer: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  sendButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    gap: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});