# API contract that the frontend assumes

The backend publishes its contract as `openapi.yaml` in the [backend repository](https://github.com/aethera-deeptech/backend), and that file wins when it differs from this page. This page lists what the frontend reads and writes, so the two sides can compare them. Every path sits under the API base URL that the build sets in `VITE_API_BASE_URL`. A request that changes data (any method except GET, HEAD and OPTIONS) also carries the header `X-Requested-With: aethera`, which the contract of the backend asks for. A request carries the session cookie, so the API must allow credentials for the exact origin of the app.

Only the files in `src/api` know these paths and shapes. When the backend differs, change those files and this page. A response that does not match its schema is shown to the user like a failed request.

Every moment is an ISO 8601 text with an offset, and it can be written in UTC (`2026-11-03T05:45:35Z`) or with the offset of the business (`2026-11-03T12:45:35+07:00`). Both name the same instant, and the screens show it by the clock of the business, which is the `timeZone` of the settings (`Asia/Jakarta` until the settings have loaded). The contract in `docs/api.md` of the backend says that every moment carries the offset of the business, but on 2026-11-03 the device views and the switch wrote UTC, so the frontend does not rely on it. A business that is not in WIB sees the times change once, when its zone arrives, and the screens keep their state.

The home screen, the list of devices and one device are read again every 30 seconds while the tab is visible, because the gateway sends a batch every 10 to 60 seconds. A hidden tab and a lost connection pause the reads, and a screen that opens or a tab that comes back reads again when its data is older than 30 seconds. The session (`GET /v1/auth/me`) is read on the same beat, so a tab notices within about 30 seconds that another tab signed in as someone else, and drops what it cached for the first account. A read that failed before any data arrived is not repeated on its own, so the error stays on the screen until the user presses the retry button. Nothing is pushed to the app, so a value on the screen can be older than the newest batch by up to a minute or so.

## Account

The screens Masuk, Daftar, Verifikasi, Ganti email and the page of the email link use these paths. The text of an error is never shown. The screens read the `code` of the error body (a short lowercase word) and the status, and they write their own texts.

| Call                                | Used for                                                                                                | Answers the screens react to                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POST /v1/auth/register`            | Daftar sends `businessName`, `email` and `password`. The 201 answer has `retryAfterSeconds`.            | 409 `email_taken`, 429                                                       |
| `POST /v1/auth/login`               | Masuk sends `email` and `password`. The 200 answer is the user and the cookie is set.                   | 401 `invalid_credentials`, 403 `email_not_verified`, 429                     |
| `POST /v1/auth/resend-verification` | The button that sends the email again, from Masuk, Verifikasi and the page of a link that does not work | 202 with `retryAfterSeconds`, 429 `resend_too_soon` with `retryAfterSeconds` |
| `POST /v1/auth/verify-email`        | The page `/verify-email?token=` sends the token once. The 200 answer is the user and the cookie is set. | 410 `token_invalid_or_expired`, 429                                          |
| `POST /v1/auth/change-email`        | Ganti email sends `email`, `password` and `newEmail`. The 202 answer has `retryAfterSeconds`.            | 401 `invalid_credentials`, 409 `email_taken`, 409 `already_verified`, 422, 429 |

The user is `{ email, emailVerified, businessName }`. After a sign in or a verification the app drops everything it cached and keeps the user as the session, so the data of another account never shows. The address of the sign up goes to the screen after it in the history entry of that visit. The app stores nothing itself, but the browser keeps the entry over a reload, and a visit with no such entry goes back to Daftar. Two more calls keep the session.

| Call                   | Used for                                                                                                                 | Answers the screens react to                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/auth/me`      | Every screen of the app waits for this answer, which is the user. The name of the business in the sidebar comes from it. | 401 sends the user to Masuk and the screen that was asked for is kept. Another failure shows a banner with a retry button and does not sign out. |
| `POST /v1/auth/logout` | Keluar ends the session of this device. A 401 counts as done, because no session is left.                                | 204. Any other failure leaves the user on Keluar with a banner.                                                                                  |

A 401 on any other call, query or mutation, means that the session ended while a screen was open. The app then reads `/v1/auth/me` again and the guard sends the user to Masuk. The 401 of the account calls themselves is not such a sign. After Keluar the app drops everything it cached, after the move to Masuk. When a read of the session names another user than before, for example because another tab signed in as someone else, the app drops what it cached for the first user. A form that is half filled when the session ends is lost, because the app keeps no drafts. Two calls serve a forgotten password. The page `/lupa-kata-sandi` sends `POST /v1/auth/forgot-password` with the email and gets 202 with `retryAfterSeconds` for every address, so its next screen never says whether the account exists. The link of the email opens `/reset-password?token=`, which sends `POST /v1/auth/reset-password` with the token and the new password once the user submits it. The page takes the token out of the address at once. The 204 answer ends every session of the user, so the page offers Masuk. A 410 `token_invalid_or_expired` shows the page for a link that does not work, with a link to ask for a new one. The link Ganti email on Verifikasi opens `/ganti-email`, and the user is not signed in, so the call carries the current email and the password. The 202 answer opens Verifikasi for the new address. A 401 `invalid_credentials` does not say whether the email or the password was wrong, and the screen says the same. A 409 `email_taken` marks the new address, a 409 `already_verified` says that the account is active and offers Masuk, a 422 shows a general banner, and a 429 holds the button for `retryAfterSeconds`. The code `already_verified` is not listed in `openapi.yaml` yet (the route description only says that a verified account cannot use it). The other account call that is not used yet is Google.

## Beranda

`GET /v1/beranda` returns the data of the home screen. The field `phase` tells which shape follows.

| Phase        | Meaning                                         | Fields besides `businessName` and `asOf`                                                      |
| ------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `no-devices` | No device is installed yet                      | none                                                                                          |
| `collecting` | The system is collecting the first days of data | `collectedDays`, `neededDays`, `topDevices`                                                   |
| `ready`      | Tips and forecasts are available                | `savingPerMonthRp`, `statusCounts`, `recommendations`, `bill`, `topDevices`, `energyPerPiece` |

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

| Phase        | Meaning                                    | Fields besides `businessName` |
| ------------ | ------------------------------------------ | ----------------------------- |
| `no-devices` | No device is installed yet                 | none                          |
| `collecting` | The first days of data are still collected | `neededDays`                  |
| `ready`      | The tips can be shown                      | `items`                       |

Each item has `id`, `title`, `savingPerMonthRp` and `status`. The status is `pending`, `deferred`, `applied`, `verified` or `rejected`. An applied tip also has `progress` with `collectedDays` and `neededDays`. A verified tip also has `resultPercent`, the drop of the energy for each piece in percent.

`GET /v1/recommendations/{id}` returns one tip with `id`, `title`, `deviceName`, `status`, `savingPerMonthRp` and `tariffIsDefault`. The texts that the system writes are `whatToDo`, `why` and `howCalculated`, which is a list of paragraphs. The tip can also have the fields below. The API answers 404 for an id that does not exist.

- `appliedAt` and `rejectedAt` are moments in ISO 8601 with an offset.
- `verification` has `collectedDays` and `neededDays` while the tip is applied.
- `result` has `beforeKwh`, `afterKwh`, `beforeDays` and `afterDays` after the verification.

`POST /v1/recommendations/{id}/reject` records that the user said no. `POST /v1/recommendations/{id}/cancel` removes the record that an applied tip was applied, and the tip waits for a decision again. After any decision the frontend loads the list, the tip and the home screen again.

## Alat

`GET /v1/devices` returns `items`, a list of the devices. An empty list means that no device is installed. Each item has `id`, `name`, `status`, `currentPowerW` and `todayKwh`. The status is `nyala`, `mati`, `siaga`, `offline` or `anomali`. The power and the energy are `null` while the device does not answer. A device with an anomaly also has `anomalyAt`, and an offline device also has `lastSeenAt`. Both are moments in ISO 8601 with an offset.

`GET /v1/devices/{id}` returns one device with the fields below. The API answers 404 for an id that does not exist.

- `id`, `name`, `status`, `room` and `kindLabel`, the type of the device as text, for example the text `WATTLINK Plug`. The backend still sends `Colokan pintar` and `Penjepit arus (dijepit di kabel)` until it changes its texts, so the screen shows what the API sends.
- `currentPowerW`, `todayKwh`, `monthKwh`, `onHoursToday` and `standbyW`, which are `null` while there are no numbers.
- `lastSeenAt` and `signal`, which is `baik`, `cukup`, `lemah` or `tidak-ada`.
- `anomaly` with `at`, `peakW` and `kind`, only while the status is `anomali`. The `kind` is `surge` (far above the usual power of that hour), `overload` (the condition that the device reports) or `degradation` (a loaded motor with a poor power factor), and the banner says which. A degradation that the API found in the readings also has `powerFactor` from 0 to 1, which the banner shows. A response with no `kind`, or a kind that the frontend does not know, reads as `surge`.
- `powerPattern`, which is `null` while there is no recent data. Otherwise it has `points`, the power in watts spread evenly over the last day, and `yMaxW`, the top of the chart. It can also have `expected` with `low` and `high`, one value for each point, and `anomaly` with `from` and `to`, the indexes of the points that are not normal.

`GET /v1/devices/{id}/relay` returns the switch of a plug, shown as the card Saklar on the page of a device. A clamp answers 409 (`no_relay`) and an id that does not exist answers 404, and the page leaves the card out for both. The answer has these fields.

- `state` is `on`, `off` or `unknown` (the plug never reported one), and `reportedAt` is when the plug said so.
- `pending` is the command that waits for the gateway or that the gateway fetched and did not answer yet. It has `id`, `action` (`on` or `off`), `status` (`pending` or `sent`) and `expiresAt`, which is 10 minutes after the command.
- `last` is the newest command that ended. It has `action`, `status` (`applied`, `failed` or `expired`), `source` (`owner` or `schedule`) and `at`. The screen shows the result for 11 minutes, and it shows the name of the schedule for as long as the last switch came from the schedule.
- `schedule` is the daily schedule of the plug, or `null`.

`POST /v1/devices/{id}/relay` with the body `{ "state": "on" }` or `{ "state": "off" }` queues a command and answers 202 with the `pending` object. The service always queues, also when the gateway is offline, and a command that no gateway fetched in 10 minutes ends as `expired`. So does a command that a gateway fetched and never answered, and one that a newer command replaced. The text of the screen therefore names the last state that the plug reported, because the plug may have switched. A new command replaces one that still waits. The answer is 429 after 60 commands in an hour for the whole business, with `retryAfterSeconds`, and the screen says the wait in minutes. While a command waits, the frontend reads the switch every 5 seconds, and otherwise on the beat of the readings.

`PUT /v1/devices/{id}/schedule` sets the daily schedule of a plug and answers 200 with it. The body has `offAt` (`HH:MM`, required), `onAt` (`HH:MM` or `null`, not the same as `offAt`), `days` (`mon-fri`, `mon-sat` or `daily`) and `enabled`, which is `false` for a paused schedule that keeps its times. The call replaces the whole schedule. The times are local times of the business, and the service looks at the schedules every minute, so a switch can come up to a minute late. It never acts on a time that passed before the schedule was set, or more than 2 hours ago. `DELETE /v1/devices/{id}/schedule` removes it and answers 204, also for a plug that has none. Both answer 409 (`no_relay`) for a clamp and 404 for an id that does not exist. The page `/alat/{id}/jadwal` reads the schedule from the answer of the switch, lists the times in steps of 15 minutes (a time of the service that is off the grid is added to the list), and says what was saved or removed on the page of the plug it returns to. The card Jadwal harian shows the schedule and the link to that page.

`PATCH /v1/devices/{id}` with the body `{ "name": "..." }` renames a device. The name is 1 to 40 characters long after the spaces at both ends are removed. The answer may have any body. After a rename the frontend loads the devices and the home screen again.

## Laporan

`GET /v1/reports` returns the report of the running month. `GET /v1/reports?period=2026-09` returns the report of another month, written as `YYYY-MM`, and `GET /v1/reports?period=2026-W43` returns the report of an ISO week, Monday to Sunday in the time zone of the business. The API answers 404 for a period that has no report. The field `phase` tells which shape follows. Every shape has `granularity` (`month` or `week`, and an answer without it means a month), `periods`, the months that have a report with the newest first (empty when no report exists yet, never empty for `ready`), `weeks`, the ISO weeks that have a report with the newest first (an answer without it means none), and `period`, the month or the week of the answer.

| Phase        | Meaning                                    | Fields besides `periods` and `period` |
| ------------ | ------------------------------------------ | ------------------------------------- |
| `no-devices` | No device is installed yet                 | none                                  |
| `collecting` | The first days of data are still collected | `collectedDays` and `neededDays`      |
| `ready`      | The report can be shown                    | see below                             |

A `ready` report has the fields below.

- `through` is a moment in ISO 8601 with an offset. It is only there while the period is the running month or the running week, and it is the moment of the newest data.
- `saving` has three parts that are counted apart. `verified` has `rp`, `count` and `checkedDays`. `applied` has `rp`, `count`, `day` and `neededDays`, the day of the check that the tip is on. `estimate` has `rp` and `count`.
- `topDevices` is a list of `name` and `kwh`, the devices that used the most energy in the month or the week.
- `billRp` is the bill of the month, or the bill until `through` for the running month. For a week it is the bill of its seven days, or until `through` for the running week.
- `energyPerPiece` has the same shape as on the home screen. Only the running month has it.

For a week the three sums of `saving` stay in the answer, but they are rates of 30 days and not amounts of a week. The screen does not show them and points to the monthly report. The API lists the running week first, and its bill stops at `through`. The oldest week in `weeks` can start before the first data. The screen marks both as not full and says that the report covers only the days with data. The oldest week has no flag from the API, so the screen reads it from its place in the list (a flag would be better).

`GET /v1/reports/{period}/pdf` returns the report of that month or week as a PDF. The frontend sends the session cookie, saves the file as `Laporan-<Month>-<Year>.pdf` or `Laporan-Minggu-<Year>-W<week>.pdf` and offers a link to open it.

## Produksi

`GET /v1/production` returns the production records of the business. It has `unit`, the unit that the business counts in, `units`, the units that it can choose from, `today`, the day of the business now, and `recent`, the newest records first. A record has `date`, written `YYYY-MM-DD`, and `quantity`, a whole number above 0. The day `today` is the last day that the form lets the user pick.

`PUT /v1/production/{date}` with the body `{ "quantity": 124, "unit": "potong" }` saves the record of that day. A day has one record, so saving a day that has one replaces it. The answer may have any body. After a save the frontend loads the records, the home screen and the report again.

## Pengaturan

`GET /v1/settings` returns the settings of the business with the fields below.

- `businessName`, the name that shows at the top of the home screen.
- `workHours` with `days`, which is `mon-fri`, `mon-sat` or `daily`, and `start` and `end`, written `HH:MM`.
- `tariff` with `rpPerKwh`, `isDefault` and `defaultRpPerKwh`. `isDefault` is true while the user has not filled in a tariff, and then `rpPerKwh` is the default.
- `anomalySensitivity`, which is `rendah`, `sedang` or `tinggi`.
- `timeZone`, an IANA zone name such as `Asia/Jakarta`. The API accepts only places with a whole hour offset from UTC, so the screen offers `Asia/Jakarta` (WIB), `Asia/Makassar` (WITA) and `Asia/Jayapura` (WIT). A zone that the API sends and the screen does not list shows its own name.

`PATCH /v1/settings` changes the settings. The body has only the fields that change, which are `businessName`, `workHours`, `tariffRpPerKwh`, `anomalySensitivity` and `timeZone`. A `tariffRpPerKwh` of `null` goes back to the default tariff. The answer may have any body. After a change the frontend loads the settings, the home screen, the tips, the devices, the production records and the report again, because the tariff, the sensitivity and the zone change their numbers.

## Pasang alat

`GET /v1/gateways` returns `items`, the gateways of the business, each with `id`, `name` and `lastSeenAt`. The screens call a gateway the WATTLINK Hub. The first step of Tambah alat reads the list. A business with no hub goes to the step `/alat/tambah/hub`, and a list that cannot be loaded does not block the choice of the device.

`POST /v1/gateways` with the body `{ "claimCode": "K7M2Q9XA", "name": "Hub pabrik" }` claims a hub with the code that its display shows. The code has 8 characters, capital letters and the digits 2 to 9, works once and for 10 minutes. The screen turns small letters into capitals and removes spaces and dashes before it sends the code. The 201 answer is the gateway, and the frontend adds it to the list it holds. A 404 `claim_code_unknown` says that the code is wrong, used or expired. A 409 `gateway_claimed_elsewhere` says that another business has the hub, and a 409 `too_many_gateways` says that the business has 10 hubs. A 422 shows a general banner, and a 429 holds the button for `retryAfterSeconds`.

`GET /v1/rooms` returns `items`, the rooms of the business, each with `id` and `name`. The user picks one when a device is added.

`POST /v1/rooms` with the body `{ "name": "Ruang cetak" }` adds a room, from the link Tambah ruangan under the room field of the form of the device. The name is 1 to 40 characters after the spaces at both ends are removed, and the API also refuses control and invisible characters with a 422. The 201 answer is the room, and the frontend adds it to the list it holds, loads the list again and chooses the room in the form. A 409 `room_exists` marks the name field, a 409 `too_many_rooms` says that the business has 100 rooms and holds the button, and a 422 shows a general banner.

`POST /v1/pairings` with the body `{ "kind": "plug", "name": "Mesin jahit 2", "roomId": "jahit" }` starts the search for a new device and answers `{ "id": "..." }`. The `kind` is `plug` for a smart plug or `clamp` for a current clamp. The name is 1 to 40 characters long after the spaces at both ends are removed. A 409 `no_gateway` says that the business has no hub, and the form offers the hub step.

`GET /v1/pairings/{id}` returns `{ "status": "searching" | "connected" | "failed" }`. The frontend asks again every 3 seconds while the status is `searching`, and the API decides when to give up and answer `failed`. When the status turns `connected` the frontend loads the devices and the home screen again.
