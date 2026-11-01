# API contract that the frontend assumes

The backend does not publish a contract yet. The frontend reads and writes the paths below, so the two sides can compare them. Every path sits under the API base URL that the build sets in `VITE_API_BASE_URL`. A request carries the session cookie, so the API must allow credentials for the exact origin of the app.

Only the files in `src/api` know these paths and shapes. When the backend differs, change those files and this page. A response that does not match its schema is shown to the user like a failed request.

## Beranda

`GET /v1/beranda` returns the data of the home screen. The field `phase` tells which shape follows.

| Phase | Meaning | Fields besides `businessName` and `asOf` |
| --- | --- | --- |
| `no-devices` | No device is installed yet | none |
| `collecting` | The system is collecting the first days of data | `collectedDays`, `neededDays`, `topDevices` |
| `ready` | Tips and forecasts are available | `savingPerMonthRp`, `statusCounts`, `recommendations`, `bill`, `topDevices`, `energyPerPiece` |

- `asOf` is the moment of the data, as an ISO 8601 date and time with an offset.
- `statusCounts` has the whole numbers `anomali`, `offline`, `siaga`, `nyala` and `mati`.
- `recommendations` is a list of `id`, `title`, `deviceName` and `savingPerMonthRp`.
- `bill` has `dailyTotalRp`, which holds one running total in rupiah for each day from the first day of the month until the day of `asOf`. It also has `projectedTotalRp` and `potentialTotalRp` for the end of the month, without and with the tips.
- `topDevices` is a list of `name` and `kwh`, the largest users first.
- `energyPerPiece` is `verified` or `estimate` with `beforeKwh` and `afterKwh`, or `collecting` with `collectedDays` and `neededDays`.
- Every amount of money is a whole number of rupiah.

## Decisions on a tip

`POST /v1/recommendations/{id}/apply` and `POST /v1/recommendations/{id}/defer` record what the user chose. Both answer with any body, and an empty body is fine. After a decision the frontend loads `GET /v1/beranda` again.
