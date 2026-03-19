Aluevalvonta sovellus on Ammattikoulun turva-alan opiskelijoille suunniteltu sovellus jolla voidaan suorittaa yksinkertaista aluevalvontaa.

Ohjelma löytyy: app/(tabs)/index.tsx

Vaaditut oikeudet:
- Camera
- GPS
- Local Storage (AsyncStorage)

Valmiina:
- UI: Kameran ja Raportti ikkunan kokoa voi säätä sliderilla
- Kamera lukee QR koodit, tunnistus lukittuu skannauksen jälkeen ja vapautuu tallennettaessa.
- Kierrosten hallinta (Uusi kierros, kierroksen valinta pudotusvalikosta).
- Skannatut raportit näkyvät listassa aikaleimoineen ja tiivistelmineen.
- Devi näppäin: Historia tyhjennyspainike ja poistonapit yksittäisille riveille.
- Monivaiheinen raportointi: 6-vaiheinen kyselyjärjestelmä koodin sisällä.
- GPS Integraatio: Koordinaattien haku ja tallennus jokaisen raportin yhteyteen.

Työn alla: 
- Yksittäisen raportin avaaminen listasta niin, että kaikki tiedot (myös ne GPS-koordinaatit ja lisätiedot) näkyvät isona.
- Loppu raportti PDF Muotoon jossa käyttäjän nimi + käydyt paikat
- Sähköposti lähettäjä halutulle tarkastajalle

Bugit:
- Tällä hetkellä riippumatta käyttäjän valinnasta kaikki vaiheet ovat näkyvissä kun tehdään raporttia.

Vaaditut:
Node.js

Powershell komennot:
- -npm install -g expo-cli
- -npm install
- -npx expo start
