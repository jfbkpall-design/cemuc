import { useEffect, useState } from 'react';

export interface ManagedPageContent {
  headline?: string;
  summary?: string;
  body?: string;
  status?: 'draft' | 'published';
  image_url?: string;
  leader1_image?: string;
  leader2_image?: string;
}

function parseContent(raw: unknown): ManagedPageContent {
  if (!raw) return {};
  if (typeof raw !== 'string') return raw as ManagedPageContent;

  try {
    return JSON.parse(raw) as ManagedPageContent;
  } catch {
    return { body: raw };
  }
}

export const useManagedPage = (slug: string, fallback: ManagedPageContent) => {
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
        const response = await fetch(`/api/paginas/${slug}`, {
          headers: { accept: 'application/json' }
        });

        if (!response.ok) return;

        const { data } = await response.json();
        const fetchedContent = {
          headline: data.titulo,
          summary: data.resumo,
          image_url: data.imagem_capa_url,
          ...parseContent(data.conteudo)
        };

        if (active) {
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
  }, [slug]);

  return content;
};
