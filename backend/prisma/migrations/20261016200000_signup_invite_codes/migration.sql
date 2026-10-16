-- One-time sign-up invite codes (October 2026).
-- Sign-up now needs a code that an admin creates for the email (POST /api/auth/invites),
-- so knowing an approved email is no longer enough to claim it. Only a SHA-256 hash of
-- the code is stored, and it is cleared once used.

-- AlterTable
ALTER TABLE "email_whitelist" ADD COLUMN     "invite_code_hash" TEXT,
ADD COLUMN     "invite_expires_at" TIMESTAMP(3);
