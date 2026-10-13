UPDATE "site_settings"
SET "curator_telegram" = '@hrommatic'
WHERE LOWER(TRIM("curator_telegram")) = '@chromatik';
