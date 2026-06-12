# KitSat Dashboard (julkinen versio)

Reaaliaikainen lentodatan seurantanäkymä KitSat-satelliitille / stratosfääripallolennolle.
Näyttää korkeuden, lämpötilan, ilmanpaineen, nopeuden, sijainnin kartalla sekä
viimeisimmän laitteen ottaman kuvan.

## Tekniikka

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- [Supabase](https://supabase.com) — telemetriadata (Postgres + Realtime) ja kuvat (Storage)
- [Recharts](https://recharts.org) — aikasarjakaaviot
- [Leaflet](https://leafletjs.com) / react-leaflet — karttanäkymä (CARTO-karttapohjat)

Telemetria luetaan Supabase-taulusta: alkulataus hakee tuoreimman lennon koko
historian sivutettuna, minkä jälkeen uudet rivit tulevat Realtime-tilauksella.
Kuvat pollataan Storage-bucketista (`camera`), jossa kullakin lennolla on oma
kansio (`<flight_id>/cap_*.jpg`).

## Käyttöönotto

1. Asenna riippuvuudet:

   ```sh
   npm install
   ```

2. Luo projektin juureen `.env`-tiedosto:

   ```sh
   VITE_SUPABASE_URL=https://<projekti>.supabase.co/
   VITE_SUPABASE_ANON_KEY=<anon-avain>
   VITE_SUPABASE_TABLE=telemetry
   ```

3. Käynnistä kehityspalvelin:

   ```sh
   npm run dev
   ```

## Komennot

| Komento           | Kuvaus                       |
| ----------------- | ---------------------------- |
| `npm run dev`     | Kehityspalvelin (HMR)        |
| `npm run build`   | Tuotantobuildi `dist/`-kansioon |
| `npm run preview` | Tuotantobuildin esikatselu   |
| `npm run lint`    | ESLint                       |

## Huomioita

- Anon-avain on julkinen selaimessa; pääsynhallinta on Supabasen RLS-policyjen
  varassa. Taululle ja bucketille tulee sallia anon-roolille vain lukuoikeus.
- Teema (tumma/vaalea) seuraa käyttöjärjestelmää, kunnes käyttäjä tekee oman
  valinnan yläpalkin napista (tallentuu `localStorage`en).
