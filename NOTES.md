# Notes

<!--
Fyll i den här filen medan du arbetar. Skriv gärna på svenska eller engelska,
välj det du är mest bekväm med.
-->

## Bugs I found

### 1. Wrong status code when creating a consultant

* **Where:** `src/routes/consultants.js`, in `POST /api/consultants`.
* **Symptom:** The existing creation test failed because the API returned `200 OK` instead of `201 Created`, as required by the README.
* **Root cause:** The route explicitly used `res.status(200)` when sending the response.
* **Fix:** I changed the status to `201`. The consultant creation logic stayed the same.
* **Test:** The existing creation test now passes. I also checked in Postman that a valid request returns `201` and the new consultant's details.


### 2. Missing consultant details when fetching by ID

* **Where:** `src/routes/consultants.js`, in `GET /api/consultants/:id`.
* **Symptom:** The API returned `200 OK` with an empty object `{}` instead of the consultant's details.
* **Root cause:** `findConsultant()` returns a Promise, but the route tried to send it as JSON without awaiting the result.
* **Fix:** I added `await` so the route waits for the lookup result before checking and returning the consultant.
* **Test:** The existing test for fetching a consultant by ID now passes. I also checked in Postman that requesting `/api/consultants/2` returns Bassam Haddad's details.


### 3. Errors returned as HTML instead of JSON

* **Where:** `src/app.js`, where `errorHandler` is registered.
* **Symptom:** Creating a consultant without a name returned `400` with an HTML error page and a stack trace instead of JSON.
* **Root cause:** The error handler was registered before the routes. Express looks forward for error handlers, so errors from these routes never reached it.
* **Fix:** I moved `app.use(errorHandler)` after the routes and the not-found handler.
* **Test:** The existing test for a missing name failed before the change and passes now. It checks that the response has status `400` and contains an `error` field.


### 4. Incorrect validation of hourly rate and experience

* **Where:** `src/routes/consultants.js`, in `POST /api/consultants`.
* **Symptom:** The API rejected `0` for hourly rate and years of experience, even though the README allows it. The checks also allowed negative numbers and non-empty strings.
* **Root cause:** The checks used `!hourlyRate` and `!yearsOfExperience`. These treat `0` as missing without properly checking the value's type or range.
* **Fix:** I replaced both checks with `Number.isFinite()` and a check for values below zero. Both fields now accept numbers greater than or equal to zero.
* **Test:** The existing test for zero rate and zero experience now passes. In Postman, both fields set to `0` returned `201`, and `yearsOfExperience: -1` returned `400` with a JSON error. Automated tests for negative and non-numeric values remain to be added.


### 5. Incorrect pagination offset

* **Where:** `src/routes/consultants.js`, in `GET /api/consultants`.
* **Symptom:** With a page size of 3, page 1 returned IDs `[4, 5, 6]` instead of `[1, 2, 3]`. Page 2 returned `[7, 8, 9]` instead of `[4, 5, 6]`.
* **Root cause:** The offset used `page * pageSize`, which skipped the first page even though page numbers start at 1.
* **Fix:** I changed the offset to `(page - 1) * pageSize`.
* **Test:** Both existing pagination tests now pass. I also confirmed in Postman that page 2 with a page size of 3 returns IDs `[4, 5, 6]`.


### 6. Incorrect availability filtering

* **Where:** `src/routes/consultants.js`, in `GET /api/consultants`.
* **Symptom:** Requesting `available=false` returned available consultants instead of unavailable ones.
* **Root cause:** Query parameters arrive as strings. `Boolean("false")` evaluates to `true` because the string is not empty.
* **Fix:** I replaced `Boolean()` with `String(req.query.available).toLowerCase() === 'true'`. This correctly handles `true` and `false` and also accepts uppercase variations.
* **Test:** The existing test for `available=false` now passes. I also confirmed in Postman that `available=true` returns only consultants whose `available` field is `true`.


### 7. Overlapping assignments were accepted

* **Where:** `src/routes/assignments.js`, in `POST /api/assignments`.
* **Symptom:** The API accepted overlapping assignments for the same consultant and returned `201 Created` instead of `409 Conflict`.
* **Root cause:** The date check only detected conflicts when the existing booking was strictly inside the new booking. It missed other types of overlap.
* **Fix:** I changed the check to `start <= bookedEnd && end >= bookedStart`. It now detects overlapping periods, including bookings that share a boundary date.
* **Test:** All 6 tests in `tests/assignments.test.js` now pass, including both overlap tests and the test for a booking without a conflict. I also confirmed in Postman that booking consultant 1 from April 1 to May 1 returns `409` with a JSON error.


### 8. Consultant IDs were reused after deletion

* **Where:** `src/data/store.js`, in `createConsultant()`.
* **Symptom:** After creating a consultant and deleting another, the next consultant could receive an ID that was already in use.
* **Root cause:** IDs were generated using `consultants.length + 1`. Deleting a consultant reduced the count, allowing the same ID to be generated again.
* **Fix:** I added a separate `nextConsultantId` counter, starting after the highest seed ID. It increases with each new consultant and is not reduced by deletions. I also reset it in `__reset()` alongside the test data.
* **Test:** The existing ID test creates a consultant, deletes consultant 5, and creates another consultant. It checks that the two newly created consultants have different IDs.


### 9. Incorrect total in paginated consultant results

* **Where:** `src/routes/consultants.js`, in `GET /api/consultants`.
* **Symptom:** Requesting three consultants per page returned `total: 3`, even though there were ten consultants in total.
* **Root cause:** The response used `items.length`, which only counts consultants on the current page.
* **Fix:** I changed it to `result.length`, which counts all matching consultants after filtering and before pagination.
* **Test:** I added two tests covering totals with and without an availability filter. Both failed before the fix and pass now.


### 10. Sorting affected later requests

* **Where:** `src/routes/consultants.js`, in `GET /api/consultants`.
* **Symptom:** After requesting `sort=rate`, a request without sorting still returned consultants in rate order instead of ID order.
* **Root cause:** `result` referenced the shared array from the store. Calling `.sort()` changed that array's order.
* **Fix:** I changed `let result = all` to `let result = [...all]` so sorting works on a separate array.
* **Test:** I added a test that requests consultants sorted by rate, then checks that a request without sorting returns IDs `[1, 2, 3]`. It failed before the fix and passes now.


### 11. PATCH allowed ID changes and unknown fields

* **Where:** `src/routes/consultants.js`, in `PATCH /api/consultants/:id`.
* **Symptom:** The API accepted changes to `id` and added unknown fields such as `nickname`, returning `200` instead of `400`.
* **Root cause:** `Object.assign(existing, req.body)` copied all incoming fields without checking whether they were allowed.
* **Fix:** I added a list of allowed fields and check every incoming field before updating the consultant. If any field is not allowed, the whole request is rejected with `400`.
* **Test:** I reproduced both cases in Postman before the fix. I added two tests for ID changes and unknown fields. Both failed before the fix and pass now. They also check that rejected requests leave the consultant unchanged.

## Things I chose not to do

## Questions / assumptions
