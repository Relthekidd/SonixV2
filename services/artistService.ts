import { supabase } from '@/lib/supabaseClient';

export interface ArtistData {
  id: string;
  name: string;
}

export async function searchArtistsByName(query: string, limit = 8): Promise<ArtistData[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Supabase error searching artists:', error.message);
    return [];
  }

  return data || [];
}
