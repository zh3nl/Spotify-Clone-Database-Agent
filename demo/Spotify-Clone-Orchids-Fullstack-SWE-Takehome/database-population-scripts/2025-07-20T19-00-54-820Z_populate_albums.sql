-- Population script for albums
-- Generated: 2025-07-20T19:00:54.820Z
-- Use this script to populate your albums table with seed data

-- Insert data for albums
INSERT INTO albums (id, album_id, title, artist, image_url, release_date, popularity_score, genre, created_at, updated_at) VALUES
  (gen_random_uuid(), '13', 'Midnights', 'Taylor Swift', 'https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png', '2022-09-25', 88, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '14', 'Harry', 'Harry Styles', 'https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png', '2020-09-25', 85, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '15', 'Un Verano Sin Ti', 'Bad Bunny', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', '2021-01-20', 94, 'Hip-Hop', NOW(), NOW()),
  (gen_random_uuid(), '16', 'Renaissance', 'Beyoncé', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', '2023-07-15', 86, 'R&B', NOW(), NOW()),
  (gen_random_uuid(), '17', 'SOUR', 'Olivia Rodrigo', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', '2023-07-25', 89, 'Hip-Hop', NOW(), NOW()),
  (gen_random_uuid(), '18', 'Folklore', 'Taylor Swift', 'https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png', '2020-07-15', 84, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '19', 'Fine Line', 'Harry Styles', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', '2021-03-25', 83, 'Pop', NOW(), NOW()),
  (gen_random_uuid(), '20', 'After Hours', 'The Weeknd', 'https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png', '2024-11-20', 99, 'R&B', NOW(), NOW());

-- Script completed for albums