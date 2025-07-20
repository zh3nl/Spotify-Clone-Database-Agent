-- Population script for recently_played
-- Generated: 2025-07-20T20:57:40.094Z
-- Use this script to populate your recently_played table with seed data

-- Insert data for recently_played
INSERT INTO recently_played (track_id, user_id, title, artist, album, image_url, played_at, duration, created_at, updated_at) VALUES
  ('1', '00000000-0000-0000-0000-000000000001', 'Liked Songs', '320 songs', 'Your Music', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', NOW() - INTERVAL '1 hour', 180, NOW(), NOW()),
  ('2', '00000000-0000-0000-0000-000000000001', 'Discover Weekly', 'Spotify', 'Weekly Mix', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', NOW() - INTERVAL '2 hour', 210, NOW(), NOW()),
  ('3', '00000000-0000-0000-0000-000000000001', 'Release Radar', 'Spotify', 'New Releases', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', NOW() - INTERVAL '3 hour', 195, NOW(), NOW()),
  ('4', '00000000-0000-0000-0000-000000000001', 'Daily Mix 1', 'Spotify', 'Daily Mix', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', NOW() - INTERVAL '4 hour', 225, NOW(), NOW()),
  ('5', '00000000-0000-0000-0000-000000000001', 'Chill Hits', 'Spotify', 'Chill Collection', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', NOW() - INTERVAL '5 hour', 240, NOW(), NOW()),
  ('6', '00000000-0000-0000-0000-000000000001', 'Top 50 - Global', 'Spotify', 'Global Charts', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', NOW() - INTERVAL '6 hour', 205, NOW(), NOW());

-- Script completed for recently_played