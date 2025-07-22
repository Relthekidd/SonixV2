import { supabase } from '../providers/AuthProvider';

export interface UploadTrack {
  title: string;
  audioUrl: string;
  duration: number;
  lyrics?: string;
  genres?: string[];
  explicit?: boolean;
  trackNumber?: number;
}

export interface UploadMusicParams {
  type: 'album' | 'single';
  artistId: string;
  title: string;
  coverUrl: string;
  releaseDate: string;
  tracks: UploadTrack[];
}

export interface UploadMusicResult {
  album?: any;
  single?: any;
  tracks: any[];
}

export async function uploadMusic({
  type,
  artistId,
  title,
  coverUrl,
  releaseDate,
  tracks,
}: UploadMusicParams): Promise<{ success: true; content: UploadMusicResult } | { success: false; error: any }> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError || new Error('User not authenticated');
    const createdBy = userData.user.id;

    const now = new Date().toISOString();

    let result: UploadMusicResult = { tracks: [] };

    if (type === 'album') {
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          title,
          cover_url: coverUrl,
          release_date: releaseDate,
          main_artist_id: artistId,
          created_by: createdBy,
          created_at: now,
        })
        .select()
        .single();
      if (albumError) throw albumError;

      const insertedTracks: any[] = [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const { data: inserted, error: trackError } = await supabase
          .from('tracks')
          .insert({
            title: t.title,
            audio_url: t.audioUrl,
            duration: t.duration,
            album_id: album.id,
            artist_id: artistId,
            cover_url: coverUrl,
            lyrics: t.lyrics || null,
            genres: t.genres || [],
            explicit: t.explicit ?? false,
            track_number: t.trackNumber ?? i + 1,
            created_by: createdBy,
            created_at: now,
          })
          .select()
          .single();
        if (trackError) throw trackError;
        insertedTracks.push(inserted);
      }
      result = { album, tracks: insertedTracks };
    } else if (type === 'single') {
      const { data: single, error: singleError } = await supabase
        .from('singles')
        .insert({
          title,
          cover_url: coverUrl,
          release_date: releaseDate,
          artist_id: artistId,
          created_by: createdBy,
          created_at: now,
        })
        .select()
        .single();
      if (singleError) throw singleError;

      const track = tracks[0];
      const { data: insertedTrack, error: trackError } = await supabase
        .from('tracks')
        .insert({
          title: track.title,
          audio_url: track.audioUrl,
          duration: track.duration,
          album_id: null,
          artist_id: artistId,
          cover_url: coverUrl,
          lyrics: track.lyrics || null,
          genres: track.genres || [],
          explicit: track.explicit ?? false,
          track_number: track.trackNumber ?? 1,
          created_by: createdBy,
          release_date: releaseDate,
          created_at: now,
        })
        .select()
        .single();
      if (trackError) throw trackError;

      result = { single, tracks: [insertedTrack] };
    }

    return { success: true, content: result };
  } catch (error) {
    console.error('Upload failed:', error);
    return { success: false, error };
  }
}

