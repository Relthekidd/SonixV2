// @ts-nocheck
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

  await supabase
    .from('tracks')
    .update({ is_published: true })
    .lte('scheduled_publish_at', now)
    .eq('is_published', false);

  await supabase
    .from('albums')
    .update({ is_published: true })
    .lte('scheduled_publish_at', now)
    .eq('is_published', false);

  return new Response('ok');
});
