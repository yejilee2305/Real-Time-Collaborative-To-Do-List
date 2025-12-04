-- Add clerk_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE;

-- Create index for clerk_id lookup
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Create invites table for email invitations
CREATE TABLE IF NOT EXISTS list_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, email)
);

-- Index for invite lookups
CREATE INDEX IF NOT EXISTS idx_list_invites_email ON list_invites(email);
CREATE INDEX IF NOT EXISTS idx_list_invites_token ON list_invites(token);
CREATE INDEX IF NOT EXISTS idx_list_invites_list_id ON list_invites(list_id);
