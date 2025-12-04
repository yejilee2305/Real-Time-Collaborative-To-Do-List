-- Migration: Add version and last_edited_by columns for conflict resolution
-- Run this after the initial schema if upgrading from Phase 3

-- Add version column with default value
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add last_edited_by column
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR(255);

-- Create trigger to auto-increment version on update
CREATE OR REPLACE FUNCTION increment_todo_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS increment_todos_version ON todos;
CREATE TRIGGER increment_todos_version
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION increment_todo_version();
