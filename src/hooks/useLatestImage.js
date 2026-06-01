import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const BUCKET = 'camera';
const POLL_INTERVAL_MS = 5_000;

async function findLatestImagePath() {
  const { data: folders } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } });

  if (!folders) return null;

  for (const folder of folders) {
    if (folder.id !== null) continue;
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1, sortBy: { column: 'name', order: 'desc' } });
    if (files && files.length > 0) return `${folder.name}/${files[0].name}`;
  }
  return null;
}

export function useLatestImage() {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastPathRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const path = await findLatestImagePath();
      if (cancelled) return;
      if (path && path !== lastPathRef.current) {
        lastPathRef.current = path;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        setUrl(data.publicUrl);
      }
      setLoading(false);
    };

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { url, loading };
}
