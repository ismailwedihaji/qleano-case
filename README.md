# Teknisk case: Qleano Consultant API

Hej och tack för att du vill göra vårt tekniska case!

Det här är ett litet Express-API som hanterar **konsulter** och **uppdrag**.
Koden fungerar nästan men den innehåller ett antal medvetna buggar. Din
uppgift är att hitta och rätta dem.

All kod, alla kommentarer, commit-meddelanden och API-svar skrivs på engelska.
Den här filen är på svenska eftersom den bara är instruktionen till dig.

---

## Kom igång

```bash
npm install
npm test          # kör testsviten
npm start         # startar API:et på http://localhost:3000
npm run dev       # startar med --watch
```

Kräver Node 18.17 eller senare. Ingen databas behövs – all data ligger i minnet
(`src/data/store.js`) och laddas om vid varje omstart.

Snabb rökkontroll:

```bash
curl http://localhost:3000/health
curl "http://localhost:3000/api/consultants?page=1&pageSize=3"
curl http://localhost:3000/api/consultants/2
```

---

## Din uppgift

1. **Kör testsviten.** Flera tester failar.
2. **Rätta buggarna** så att alla tester blir gröna utan att ändra testernas
   förväntningar. Om du tycker att ett test är fel skrivet: rätta koden ändå och
   skriv en kommentar om det i `NOTES.md`.
3. **Alla buggar täcks inte av tester.** Läs API-kontraktet nedan och jämför med
   hur koden faktiskt beter sig. Det finns potentiellt buggar som inte täcks av testsviten.
4. **Skriv tester för de buggar du hittar själv**, så att de inte kan komma tillbaka.
5. **Dokumentera** i en `NOTES.md`: vilka buggar du hittade, vad grundorsaken var,
   hur du åtgärdade dem, och vad du skulle vilja göra men inte hann. Sätt sedan ihop ett par slides inför vårt samtal där du presenterar detta. 
---

## API-kontrakt

Så här *ska* API:et bete sig.

### `GET /api/consultants`

| Query | Standard | Betydelse |
|---|---|---|
| `page` | `1` | Sidnummer, **1-indexerat** |
| `pageSize` | `10` | Antal per sida |
| `skill` | – | Matchar en kompetens, **skiftlägesoberoende** (`node.js` matchar `Node.js`) |
| `available` | – | `true` eller `false`, filtrerar på tillgänglighet |
| `sort` | – | `rate` sorterar på `hourlyRate` stigande |

Svar `200`:

```json
{
  "items": [ /* konsulter för den begärda sidan */ ],
  "page": 1,
  "pageSize": 10,
  "total": 10
}
```

* `total` = antal träffar **efter filtrering, före paginering** – inte antalet
  poster på den aktuella sidan.
* Standardordningen är stigande `id`. Att sortera i en förfrågan får **aldrig**
  påverka ordningen i efterföljande förfrågningar.

### `GET /api/consultants/:id`

* `200` med konsultobjektet.
* `404` om id:t inte finns.
* `400` om id:t inte är ett positivt heltal (t.ex. `/api/consultants/abc`).

### `POST /api/consultants`

Body:

```json
{
  "name": "Karin Frost",
  "email": "karin@example.com",
  "skills": ["Node.js"],
  "hourlyRate": 900,
  "yearsOfExperience": 6,
  "available": true
}
```

* `201` med den skapade konsulten, inklusive nytt `id`.
* `400` om `name` saknas, `email` är ogiltig, `skills` inte är en lista, eller om
  `hourlyRate` / `yearsOfExperience` saknas eller inte är tal `>= 0`.
* `0` är ett **giltigt** värde för `hourlyRate` och `yearsOfExperience`
  (praktikanter finns).
* `available` defaultar till `true`.
* Ett `id` som en gång har använts får **aldrig** återanvändas, inte ens efter
  att konsulten tagits bort.

### `PATCH /api/consultants/:id`

* `200` med den uppdaterade konsulten.
* Endast dessa fält får uppdateras: `name`, `email`, `skills`, `hourlyRate`,
  `yearsOfExperience`, `available`.
* `id` får aldrig kunna ändras av klienten, och okända fält ska ge `400` –
  de får inte tystas ned och inte heller sparas på konsulten.
* `404` om id:t inte finns, `400` om id:t är ogiltigt.

### `DELETE /api/consultants/:id`

* `204` utan body.
* `404` om id:t inte finns.

### `GET /api/assignments`

* Valfri query `consultantId` filtrerar på konsult.
* Svar: `{ "items": [...], "total": <antal> }`.

### `POST /api/assignments`

Body: `{ "consultantId": 1, "title": "...", "startDate": "2026-08-01", "endDate": "2026-08-31" }`

* `201` med det skapade uppdraget.
* `400` om `title`, `startDate` eller `endDate` saknas, om ett datum inte går
  att tolka, eller om `endDate` inte ligger efter `startDate`.
* `404` om konsulten inte finns.
* `409` om konsulten redan har ett uppdrag som **överlappar i tid**. Två
  intervall överlappar oavsett hur de ligger i förhållande till varandra – det
  räcker att de delar minst en dag.

### Felformat

Alla fel oavsett statuskod ska svara med JSON:

```json
{ "error": "No consultant with id 999", "code": "NotFoundError" }
```

Inga HTML-sidor, och aldrig stacktrace eller interna detaljer i svaret till
klienten. `5xx` loggas på servern men får inte läcka ut.

---

## Så bedömer vi

* **Hittar du grundorsaken?** Vi vill se att buggen är förstådd, inte att
  symptomet är dolt.
* **Är fixarna små och tydliga?** Ingen ombyggnad av hela API:et behövs.
* **Testar du?** Nya tester för de buggar du hittade själv väger tungt.
* **Kan du förklara?** Vi går igenom din `NOTES.md`, `dina slides` och koden tillsammans med
  dig efteråt

Du får byta ut eller lägga till bibliotek om du motiverar varför, men det
går utmärkt att lösa hela caset utan nya beroenden.

---

## Inlämning

Skicka ett git-repo (utan `node_modules/`) med din kod och din
`NOTES.md`. Har du gjort commits vill vi gärna se dem – en commit per bugg gör
det lätt för oss att följa ditt tänk.

Frågor? Maila mig, jonathan@qleano.se, jag svarar gärna. Lycka till!