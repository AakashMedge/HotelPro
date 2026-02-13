UPDATE "Client" SET "accessCode" = UPPER(SUBSTRING("slug", 1, 3)) || FLOOR(RANDOM() * 900 + 100)::TEXT, "accessCodeUpdatedAt" = NOW() WHERE "accessCode" IS NULL;
