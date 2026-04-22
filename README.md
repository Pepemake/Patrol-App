# Alva - Vartioinnin seurantasovellus

Tämä sovellus on kehitetty turvallisuusalan opiskelijoiden ja ammattilaisten käyttöön vartiokierrosten raportointia varten.

## Pääominaisuudet
- **QR-koodin skannaus:** Tunnistaa kohteet ja avaa oikean raportointilomakkeen.
- **Dynaaminen raportointi:** Kattavat kategoriat (Palo, Lukitus, Kiinteistö, Henkilöt, Voimankäyttö, Rikos).
- **Paikannus:** Tallentaa koordinaatit automaattisesti raportin yhteyteen.
- **Paikallinen tallennus:** Kierroshistoria säilyy laitteessa (`AsyncStorage`).

## Tekninen toteutus
- **Framework:** React Native (Expo)
- **Kieli:** TypeScript
- **Build-työkalu:** Expo Application Services 

## Kehittäjälle
Uuden version rakentaminen:
1. Päivitä `app.json` (version ja versionCode).
2. Aja `eas build -p android --profile preview`.

## Fyysisesti
1. Etsi valitsemasi QR Koodin luoja esim: https://qr.io.com ja muuta haluamasi katu/kohde/rakennus tekstiksi QR Kenttään. 
2. Skannaa QR Koodi
3. Valitse haluamasi puutteet
4. Jatka tai mene raportointi osioon
5. Lähetä opettajalle, raportti menee puhelimeen kirjaudutun sähköpostin kautta. 

## Tekijä
Airio Perttu 2026
