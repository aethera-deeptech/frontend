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

`POST /v1/recommendations/{id}/apply` and `POST /v1/recommendations/{id}/defer` record what the user chose on a tip that waits. Both answer with any body, and an empty body is fine. The decisions of the Saran screens are listed under Saran.

## Saran

`GET /v1/recommendations` returns the list of tips. The field `phase` tells which shape follows.

| Phase | Meaning | Fields besides `businessName` |
| --- | --- | --- |
| `no-devices` | No device is installed yet | none |
| `collecting` | The first days of data are still collected | `neededDays` |
| `ready` | The tips can be shown | `items` |

Each item has `id`, `title`, `savingPerMonthRp` and `status`. The status is `pending`, `deferred`, `applied`, `verified` or `rejected`. An applied tip also has `progress` with `collectedDays` and `neededDays`. A verified tip also has `resultPercent`, the drop of the energy for each piece in percent.

`GET /v1/recommendations/{id}` returns one tip with `id`, `title`, `deviceName`, `status`, `savingPerMonthRp` and `tariffIsDefault`. The texts that the system writes are `whatToDo`, `why` and `howCalculated`, which is a list of paragraphs. The tip can also have the fields below. The API answers 404 for an id that does not exist.

- `appliedAt` and `rejectedAt` are moments in ISO 8601 with an offset.
- `verification` has `collectedDays` and `neededDays` while the tip is applied.
- `result` has `beforeKwh`, `afterKwh`, `beforeDays` and `afterDays` after the verification.

`POST /v1/recommendations/{id}/reject` records that the user said no. `POST /v1/recommendations/{id}/cancel` removes the record that an applied tip was applied, and the tip waits for a decision again. After any decision the frontend loads the list, the tip and the home screen again.

## Alat

`GET /v1/devices` returns `items`, a list of the devices. An empty list means that no device is installed. Each item has `id`, `name`, `status`, `currentPowerW` and `todayKwh`. The status is `nyala`, `mati`, `siaga`, `offline` or `anomali`. The power and the energy are `null` while the device does not answer. A device with an anomaly also has `anomalyAt`, and an offline device also has `lastSeenAt`. Both are moments in ISO 8601 with an offset.

`GET /v1/devices/{id}` returns one device with the fields below. The API answers 404 for an id that does not exist.

- `id`, `name`, `status`, `room` and `kindLabel`, the type of the device as text, for example the text `Colokan pintar`.
- `currentPowerW`, `todayKwh`, `monthKwh`, `onHoursToday` and `standbyW`, which are `null` while there are no numbers.
- `lastSeenAt` and `signal`, which is `baik`, `cukup`, `lemah` or `tidak-ada`.
- `anomaly` with `at` and `peakW`, only while the status is `anomali`.
- `powerPattern`, which is `null` while there is no recent data. Otherwise it has `points`, the power in watts spread evenly over the last day, and `yMaxW`, the top of the chart. It can also have `expected` with `low` and `high`, one value for each point, and `anomaly` with `from` and `to`, the indexes of the points that are not normal.

`PATCH /v1/devices/{id}` with the body `{ "name": "..." }` renames a device. The name is 1 to 40 characters long after the spaces at both ends are removed. The answer may have any body. After a rename the frontend loads the devices and the home screen again.

## Laporan

`GET /v1/reports` returns the report of the running month. `GET /v1/reports?period=2026-09` returns the report of another month, written as `YYYY-MM`. The API answers 404 for a month that has no report. The field `phase` tells which shape follows. Every shape has `periods`, the months that have a report with the newest first, and `period`, the month of the answer.

| Phase        | Meaning                                    | Fields besides `periods` and `period` |
| ------------ | ------------------------------------------ | ------------------------------------- |
| `no-devices` | No device is installed yet                 | none                                  |
| `collecting` | The first days of data are still collected | `collectedDays` and `neededDays`      |
| `ready`      | The report can be shown                    | see below                             |

A `ready` report has the fields below.

- `through` is a moment in ISO 8601 with an offset. It is only there while the month is the running month, and it is the moment of the newest data.
- `saving` has three parts that are counted apart. `verified` has `rp`, `count` and `checkedDays`. `applied` has `rp`, `count`, `day` and `neededDays`, the day of the check that the tip is on. `estimate` has `rp` and `count`.
- `topDevices` is a list of `name` and `kwh`, the devices that used the most energy in the month.
- `billRp` is the bill of the month, or the bill until `through` for the running month.
- `energyPerPiece` has the same shape as on the home screen. Only the running month has it.

`GET /v1/reports/{period}/pdf` returns the report of that month as a PDF. The frontend sends the session cookie, saves the file as `Laporan-<Month>-<Year>.pdf` and offers a link to open it.

## Produksi

`GET /v1/production` returns the production records of the business. It has `unit`, the unit that the business counts in, `units`, the units that it can choose from, `today`, the day of the business now, and `recent`, the newest records first. A record has `date`, written `YYYY-MM-DD`, and `quantity`, a whole number above 0. The day `today` is the last day that the form lets the user pick.

`PUT /v1/production/{date}` with the body `{ "quantity": 124, "unit": "potong" }` saves the record of that day. A day has one record, so saving a day that has one replaces it. The answer may have any body. After a save the frontend loads the records, the home screen and the report again.
