ALTER TABLE boards ADD COLUMN invite_code_expires_at TIMESTAMPTZ;
UPDATE boards SET invite_code_expires_at = created_at + INTERVAL '7 days' WHERE invite_code_expires_at IS NULL;
ALTER TABLE boards ALTER COLUMN invite_code_expires_at SET NOT NULL;
