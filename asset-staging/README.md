# Tax Estimator 2026 media staging

Upload the exact file `tax-estimator-2026.zip` to **this folder** using GitHub's Add file > Upload files. Do NOT upload the extracted 31 files separately here.

The workflow `.github/workflows/publish-tax-estimator-media.yml` validates the ZIP's SHA-256, publishes its 27 WebP screenshots, one original PNG and three original PDF reports to `assets/guides/tax-estimator-2026/`, and removes the temporary ZIP.

Use the upload package supplied in the ChatGPT conversation; a recompressed archive will not match the verified SHA-256.
