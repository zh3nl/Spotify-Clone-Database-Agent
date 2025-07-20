-- Population script for albums
-- Generated: 2025-07-20T18:43:25.365Z
-- Use this script to populate your albums table with seed data

-- Insert data for albums
INSERT INTO albums (id, album_id, title, artist, image_url, release_date, popularity_score, genre, created_at, updated_at) VALUES
  (gen_random_uuid(), '13', 'Midnights', 'Taylor Swift', 'https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png', '2020-05-15', 82, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '14', 'Harry', 'Harry Styles', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', '2022-07-20', 95, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '15', 'Un Verano Sin Ti', 'Bad Bunny', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', '2022-09-20', 81, 'Hip-Hop', NOW(), NOW()),
  (gen_random_uuid(), '16', 'Renaissance', 'Beyoncé', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', '2022-05-20', 88, 'R&B', NOW(), NOW()),
  (gen_random_uuid(), '17', 'SOUR', 'Olivia Rodrigo', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', '2020-01-20', 83, 'Alternative', NOW(), NOW()),
  (gen_random_uuid(), '18', 'Folklore', 'Taylor Swift', 'https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png', '2023-07-15', 92, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '19', 'Fine Line', 'Harry Styles', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', '2024-11-15', 99, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '20', 'After Hours', 'The Weeknd', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', '2022-01-20', 97, 'R&B', NOW(), NOW());

-- Script completed for albums