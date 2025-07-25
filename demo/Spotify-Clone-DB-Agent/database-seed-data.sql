-- Database Seed Data Population Script
-- Extracted from spotify-main-content.tsx backup file
-- Run this script in your Supabase SQL Editor to populate the tables

-- Clean existing data (optional - remove these lines if you want to keep existing data)
-- DELETE FROM recently_played;
-- DELETE FROM made_for_you;  
-- DELETE FROM popular_albums;

-- Insert Recently Played Data
INSERT INTO recently_played (id, title, artist, album, image_url, duration, played_at, user_id, created_at) VALUES
('1', 'Liked Songs', '320 songs', 'Your Music', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', 180, NOW() - INTERVAL '1 hour', 'default-user', NOW()),
('2', 'Discover Weekly', 'Spotify', 'Weekly Mix', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', 210, NOW() - INTERVAL '2 hours', 'default-user', NOW()),
('3', 'Release Radar', 'Spotify', 'New Releases', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', 195, NOW() - INTERVAL '3 hours', 'default-user', NOW()),
('4', 'Daily Mix 1', 'Spotify', 'Daily Mix', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', 225, NOW() - INTERVAL '4 hours', 'default-user', NOW()),
('5', 'Chill Hits', 'Spotify', 'Chill Collection', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', 240, NOW() - INTERVAL '5 hours', 'default-user', NOW()),
('6', 'Top 50 - Global', 'Spotify', 'Global Charts', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', 205, NOW() - INTERVAL '6 hours', 'default-user', NOW());

-- Insert Made For You Data  
INSERT INTO made_for_you (id, title, description, image_url, playlist_type, user_id, created_at, updated_at) VALUES
('7', 'Discover Weekly', 'Your weekly mixtape of fresh music', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', 'personalized', 'default-user', NOW(), NOW()),
('8', 'Release Radar', 'Catch all the latest music from artists you follow', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', 'personalized', 'default-user', NOW(), NOW()),
('9', 'Daily Mix 1', 'Billie Eilish, Lorde, Clairo and more', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', 'daily_mix', 'default-user', NOW(), NOW()),
('10', 'Daily Mix 2', 'Arctic Monkeys, The Strokes, Tame Impala and more', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', 'daily_mix', 'default-user', NOW(), NOW()),
('11', 'Daily Mix 3', 'Taylor Swift, Olivia Rodrigo, Gracie Abrams and more', 'https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png', 'daily_mix', 'default-user', NOW(), NOW()),
('12', 'On Repeat', 'The songs you can''t get enough of', 'https://v3.fal.media/files/rabbit/mVegWQYIe0yj8NixTQQG-_output.png', 'personalized', 'default-user', NOW(), NOW());

-- Insert Popular Albums Data
INSERT INTO popular_albums (id, title, artist, image_url, release_date, duration, popularity_score, created_at, updated_at) VALUES
('13', 'Midnights', 'Taylor Swift', 'https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png', '2022-10-21', 275, 98, NOW(), NOW()),
('14', 'Harry''s House', 'Harry Styles', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', '2022-05-20', 245, 95, NOW(), NOW()),
('15', 'Un Verano Sin Ti', 'Bad Bunny', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', '2022-05-06', 265, 96, NOW(), NOW()),
('16', 'Renaissance', 'Beyoncé', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', '2022-07-29', 290, 94, NOW(), NOW()),
('17', 'SOUR', 'Olivia Rodrigo', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', '2021-05-21', 215, 97, NOW(), NOW()),
('18', 'Folklore', 'Taylor Swift', 'https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png', '2020-07-24', 285, 93, NOW(), NOW()),
('19', 'Fine Line', 'Harry Styles', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', '2019-12-13', 255, 92, NOW(), NOW()),
('20', 'After Hours', 'The Weeknd', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', '2020-03-20', 270, 91, NOW(), NOW());

-- Verify the data was inserted correctly
SELECT 'recently_played' as table_name, COUNT(*) as record_count FROM recently_played
UNION ALL
SELECT 'made_for_you' as table_name, COUNT(*) as record_count FROM made_for_you  
UNION ALL
SELECT 'popular_albums' as table_name, COUNT(*) as record_count FROM popular_albums;