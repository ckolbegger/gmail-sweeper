-- Add recipient-related columns required by EmailRepository
ALTER TABLE emails ADD COLUMN recipients TEXT;
ALTER TABLE emails ADD COLUMN cc TEXT;
ALTER TABLE emails ADD COLUMN bcc TEXT;
