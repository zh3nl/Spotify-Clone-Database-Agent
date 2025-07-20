-- Population script for playlists
-- Generated: 2025-07-20T19:00:59.128Z
-- Use this script to populate your playlists table with seed data

-- Insert data for playlists
INSERT INTO playlists (id, user_id, title, description, image_url, type, recommendation_score, created_at, updated_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Discover Weekly', 'Your weekly mixtape of fresh music', 'https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png', 'personalized', 0.92, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Release Radar', 'Catch all the latest music from artists you follow', 'https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png', 'personalized', 0.96, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Daily Mix 1', 'Billie Eilish, Lorde, Clairo and more', 'https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png', 'personalized', 0.87, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Daily Mix 2', 'Arctic Monkeys, The Strokes, Tame Impala and more', 'https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png', 'personalized', 0.8, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Daily Mix 3', 'Taylor Swift, Olivia Rodrigo, Gracie Abrams and more', 'https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png', 'personalized', 0.93, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'On Repeat', 'The songs you can', 'https://v3.fal.media/files/rabbit/mVegWQYIe0yj8NixTQQG-_output.png', 'personalized', 0.98, NOW(), NOW());

-- Script completed for playlists