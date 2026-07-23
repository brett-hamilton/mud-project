-- server/src/db/schema.sql
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  current_room_id VARCHAR(100) NOT NULL DEFAULT 'dark_forest_entrance',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);