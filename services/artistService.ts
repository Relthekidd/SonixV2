import { supabase } from '@/providers/AuthProvider';

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

export async function findOrCreateArtistByName(name: string): Promise<ArtistData | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing, error: searchError } = await supabase
    .from('artists')
    .select('id, name')
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle();

  if (searchError && searchError.code !== 'PGRST116') {
    console.error('Supabase error searching artist:', searchError.message);
    return null;
  }

  if (existing) {
    return existing as ArtistData;
  }

  const { data: created, error: insertError } = await supabase
    .from('artists')
    .insert({ name: trimmed })
    .select('id, name')
    .single();

  if (insertError) {
    console.error('Supabase error creating artist:', insertError.message);
    return null;
  }

  return created as ArtistData;
}
