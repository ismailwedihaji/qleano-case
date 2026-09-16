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

## Things I chose not to do

## Questions / assumptions
