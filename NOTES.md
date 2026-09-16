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

## Things I chose not to do

## Questions / assumptions
