-- Supabase SQL Setup for Multiplayer Features
-- Run these queries in Supabase SQL Editor

-- 1. Chat Messages Table
CREATE TABLE IF NOT EXISTS room_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  player_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT room_chat_messages_room_code_fkey FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
);

CREATE INDEX idx_room_chat_messages_room_code ON room_chat_messages(room_code);
CREATE INDEX idx_room_chat_messages_created_at ON room_chat_messages(created_at DESC);

-- 2. Player Presence Tracking Table
CREATE TABLE IF NOT EXISTS room_player_presence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT,
  is_online BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(room_code, player_id)
);

CREATE INDEX idx_room_player_presence_room_code ON room_player_presence(room_code);
CREATE INDEX idx_room_player_presence_updated_at ON room_player_presence(updated_at DESC);

-- 3. Real-time Sudoku Updates Table
CREATE TABLE IF NOT EXISTS sudoku_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  level INTEGER NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  value INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sudoku_updates_room_code_level ON sudoku_updates(room_code, level);
CREATE INDEX idx_sudoku_updates_created_at ON sudoku_updates(created_at DESC);

-- 4. Player Actions Log Table
CREATE TABLE IF NOT EXISTS player_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  level INTEGER NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  player_id TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_player_actions_room_code_level ON player_actions(room_code, level);
CREATE INDEX idx_player_actions_created_at ON player_actions(created_at DESC);

-- 5. Puzzle States Table (for Level 2+ synchronization)
CREATE TABLE IF NOT EXISTS puzzle_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  level INTEGER NOT NULL,
  state JSONB,
  player_id TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_puzzle_states_room_code_level ON puzzle_states(room_code, level);
CREATE INDEX idx_puzzle_states_created_at ON puzzle_states(created_at DESC);

-- 6. Room Sessions Table (if not exists)
CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  created_by TEXT,
  max_players INTEGER DEFAULT 3,
  current_players INTEGER DEFAULT 0,
  remaining_time INTEGER DEFAULT 1800,
  is_started BOOLEAN DEFAULT false
);

-- Enable RLS (Row Level Security) for real-time features
ALTER TABLE room_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_player_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sudoku_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_states ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read/write for room-based access
CREATE POLICY "room_chat_messages_insert" ON room_chat_messages FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "room_chat_messages_select" ON room_chat_messages FOR SELECT 
  USING (true);

CREATE POLICY "room_player_presence_upsert" ON room_player_presence FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "room_player_presence_update" ON room_player_presence FOR UPDATE 
  USING (true) WITH CHECK (true);

CREATE POLICY "room_player_presence_select" ON room_player_presence FOR SELECT 
  USING (true);

CREATE POLICY "sudoku_updates_insert" ON sudoku_updates FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "sudoku_updates_select" ON sudoku_updates FOR SELECT 
  USING (true);

CREATE POLICY "player_actions_insert" ON player_actions FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "player_actions_select" ON player_actions FOR SELECT 
  USING (true);

CREATE POLICY "puzzle_states_insert" ON puzzle_states FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "puzzle_states_select" ON puzzle_states FOR SELECT 
  USING (true);

-- Optional: Create a view for room statistics
CREATE OR REPLACE VIEW room_stats AS
SELECT 
  r.code,
  COUNT(DISTINCT rpp.player_id) as active_players,
  COUNT(DISTINCT rcm.id) as message_count,
  MAX(rcm.created_at) as last_message_time
FROM rooms r
LEFT JOIN room_player_presence rpp ON r.code = rpp.room_code AND rpp.is_online = true
LEFT JOIN room_chat_messages rcm ON r.code = rcm.room_code
GROUP BY r.code;

-- 7. Add remaining_time column to rooms table if it doesn't exist
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS remaining_time INTEGER DEFAULT 1800;

-- 8. Enable Supabase Realtime for the tables
-- Run these to add tables to the replication publication so client-side postgres_changes works
ALTER PUBLICATION supabase_realtime ADD TABLE room_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_player_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE sudoku_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE player_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE puzzle_states;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- ✅ Setup complete!
-- Next steps:
-- 1. Run these SQL queries in your Supabase SQL Editor
-- 2. The real-time features will automatically work with Supabase Realtime
-- 3. No need to restart your Next.js app
