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

## Things I chose not to do

## Questions / assumptions
