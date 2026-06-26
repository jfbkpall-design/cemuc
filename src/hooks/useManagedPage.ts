import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export interface ManagedPageContent {
  headline?: string;
  summary?: string;
  body?: string;
  status?: 'draft' | 'published';
  image_url?: string;
  leader1_image?: string;
  leader2_image?: string;
}

export const useManagedPage = (slug: string, fallback: ManagedPageContent) => {
  // Inicializa o estado lendo instantaneamente o conteúdo do cache se houver
  const [content, setContent] = useState<ManagedPageContent>(() => {
    try {
      const cached = localStorage.getItem(`cemuc_page_${slug}`);
      return cached ? { ...fallback, ...JSON.parse(cached) } : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const { data } = await supabase
          .from('system_pages')
          .select('content')
          .eq('slug', slug)
          .single();

        if (active && data?.content) {
          const fetchedContent = data.content as ManagedPageContent;
          setContent({ ...fallback, ...fetchedContent });
          localStorage.setItem(`cemuc_page_${slug}`, JSON.stringify(fetchedContent));
        }
      } catch (err) {
        console.error('Erro ao buscar página dinâmica:', err);
      }
    };

    loadPage();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return content;
};
