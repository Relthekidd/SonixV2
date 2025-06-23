import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('play_history').del();
  await knex('user_likes').del();
  await knex('playlist_tracks').del();
  await knex('playlists').del();
  await knex('tracks').del();
  await knex('albums').del();
  await knex('artists').del();
  await knex('users').del();

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = await knex('users').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@sonix.com',
      password_hash: hashedPassword,
      display_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_verified: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'artist1@sonix.com',
      password_hash: hashedPassword,
      display_name: 'Luna Waves',
      first_name: 'Luna',
      last_name: 'Waves',
      role: 'artist',
      is_verified: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'artist2@sonix.com',
      password_hash: hashedPassword,
      display_name: 'Neon Pulse',
      first_name: 'Neon',
      last_name: 'Pulse',
      role: 'artist',
      is_verified: true
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      email: 'listener@sonix.com',
      password_hash: hashedPassword,
      display_name: 'Music Lover',
      first_name: 'Music',
      last_name: 'Lover',
      role: 'listener'
    }
  ]).returning('*');

  // Create artist profiles
  const artists = await knex('artists').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440011',
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      stage_name: 'Luna Waves',
      bio: 'Electronic music producer creating ethereal soundscapes',
      genres: JSON.stringify(['Electronic', 'Ambient', 'Synthwave']),
      social_links: JSON.stringify({
        instagram: '@lunawaves',
        twitter: '@lunawaves_music',
        spotify: 'lunawaves'
      }),
      is_verified: true,
      monthly_listeners: 15000,
      total_plays: 250000
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440012',
      user_id: '550e8400-e29b-41d4-a716-446655440003',
      stage_name: 'Neon Pulse',
      bio: 'Synthwave artist bringing retro-futuristic vibes',
      genres: JSON.stringify(['Synthwave', 'Electronic', 'Retro']),
      social_links: JSON.stringify({
        instagram: '@neonpulse',
        twitter: '@neonpulse_music'
      }),
      is_verified: true,
      monthly_listeners: 8500,
      total_plays: 120000
    }
  ]).returning('*');

  // Create albums
  const albums = await knex('albums').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440021',
      artist_id: '550e8400-e29b-41d4-a716-446655440011',
      title: 'Ethereal Nights',
      description: 'A journey through ambient electronic landscapes',
      cover_url: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'album',
      genres: JSON.stringify(['Electronic', 'Ambient']),
      release_date: '2024-01-15',
      is_published: true,
      total_tracks: 8,
      total_duration: 2400
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440022',
      artist_id: '550e8400-e29b-41d4-a716-446655440012',
      title: 'Neon Dreams',
      description: 'Retro-futuristic synthwave collection',
      cover_url: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      type: 'album',
      genres: JSON.stringify(['Synthwave', 'Electronic']),
      release_date: '2024-02-01',
      is_published: true,
      total_tracks: 6,
      total_duration: 1800
    }
  ]).returning('*');

  // Create tracks
  const tracks = await knex('tracks').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440031',
      artist_id: '550e8400-e29b-41d4-a716-446655440011',
      album_id: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Midnight Dreams',
      lyrics: 'Floating through the midnight sky...',
      audio_url: 'https://example.com/audio/midnight-dreams.mp3',
      cover_url: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: 240,
      track_number: 1,
      genres: JSON.stringify(['Electronic', 'Ambient']),
      featured_artists: JSON.stringify([]),
      is_explicit: false,
      is_published: true,
      play_count: 15000,
      like_count: 850
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440032',
      artist_id: '550e8400-e29b-41d4-a716-446655440011',
      album_id: '550e8400-e29b-41d4-a716-446655440021',
      title: 'Ocean Waves',
      audio_url: 'https://example.com/audio/ocean-waves.mp3',
      cover_url: 'https://images.pexels.com/photos/167092/pexels-photo-167092.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: 320,
      track_number: 2,
      genres: JSON.stringify(['Electronic', 'Ambient']),
      featured_artists: JSON.stringify([]),
      is_explicit: false,
      is_published: true,
      play_count: 12000,
      like_count: 720
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440033',
      artist_id: '550e8400-e29b-41d4-a716-446655440012',
      album_id: '550e8400-e29b-41d4-a716-446655440022',
      title: 'City Lights',
      audio_url: 'https://example.com/audio/city-lights.mp3',
      cover_url: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: 280,
      track_number: 1,
      genres: JSON.stringify(['Synthwave', 'Electronic']),
      featured_artists: JSON.stringify([]),
      is_explicit: false,
      is_published: true,
      play_count: 8500,
      like_count: 420
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440034',
      artist_id: '550e8400-e29b-41d4-a716-446655440012',
      title: 'Retro Future',
      audio_url: 'https://example.com/audio/retro-future.mp3',
      cover_url: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: 195,
      genres: JSON.stringify(['Synthwave', 'Electronic']),
      featured_artists: JSON.stringify([]),
      is_explicit: false,
      is_published: true,
      play_count: 6200,
      like_count: 310
    }
  ]).returning('*');

  // Create playlists
  const playlists = await knex('playlists').insert([
    {
      id: '550e8400-e29b-41d4-a716-446655440041',
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Chill Electronic',
      description: 'Perfect for relaxing and focusing',
      cover_url: 'https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg?auto=compress&cs=tinysrgb&w=400',
      is_public: true,
      is_collaborative: false,
      total_tracks: 2,
      total_duration: 560,
      follower_count: 45
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440042',
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'My Favorites',
      description: 'My personal favorite tracks',
      is_public: false,
      is_collaborative: false,
      total_tracks: 1,
      total_duration: 240,
      follower_count: 0
    }
  ]).returning('*');

  // Add tracks to playlists
  await knex('playlist_tracks').insert([
    {
      playlist_id: '550e8400-e29b-41d4-a716-446655440041',
      track_id: '550e8400-e29b-41d4-a716-446655440031',
      added_by: '550e8400-e29b-41d4-a716-446655440004',
      position: 1
    },
    {
      playlist_id: '550e8400-e29b-41d4-a716-446655440041',
      track_id: '550e8400-e29b-41d4-a716-446655440032',
      added_by: '550e8400-e29b-41d4-a716-446655440004',
      position: 2
    },
    {
      playlist_id: '550e8400-e29b-41d4-a716-446655440042',
      track_id: '550e8400-e29b-41d4-a716-446655440031',
      added_by: '550e8400-e29b-41d4-a716-446655440004',
      position: 1
    }
  ]);

  // Add some user likes
  await knex('user_likes').insert([
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      track_id: '550e8400-e29b-41d4-a716-446655440031'
    },
    {
      user_id: '550e8400-e29b-41d4-a716-446655440004',
      track_id: '550e8400-e29b-41d4-a716-446655440033'
    }
  ]);

  console.log('✅ Sample data seeded successfully');
}