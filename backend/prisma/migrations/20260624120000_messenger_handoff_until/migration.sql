-- Replace permanent handoff flag with 24h expiry timestamp
ALTER TABLE "MessengerConversation" ADD COLUMN "handoffUntil" TIMESTAMP(3);

-- Release conversations stuck in old handoff mode immediately
UPDATE "MessengerConversation"
SET "handoffUntil" = NOW()
WHERE "handoffToAdmin" = true;

ALTER TABLE "MessengerConversation" DROP COLUMN "handoffToAdmin";
