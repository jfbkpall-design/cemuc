import { createClient } from '@supabase/supabase-js';

// Essas chaves são injetadas pelas variáveis de ambiente do Vite no build.
// Por padrão, se não estiverem definidas, usamos placeholders para evitar crash em desenvolvimento local.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
