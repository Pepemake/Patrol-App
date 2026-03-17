Patrol App is a commission project wich aims to help the daily life of Security students during their studies

The app is supposed to be a light weight onpatrol tracker wich reads QR codes and saves location data on the phone
wich can be later on looked at by the supervisor inspecting the patrols

Main code in app/(tabs)/index.tsx

This app uses:
- Camera
- GPS
- Local Storage (AsyncStorage)

Working:
- Qr Reader
- Basic UI
- Data List
- some dev buttons


In Progress:
- route comments
- Better UI
- Basic main menu

Required to run the app server:
Node.js

To run, Powershell:
npm install -g expo-cli
npm install
npx expo start
