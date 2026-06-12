import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const BUCKET = 'camera';
const POLL_INTERVAL_MS = 5_000;
// Täysi skannaus käy jokaisen kansion erikseen läpi (1 pyyntö / kansio), joten
// se tehdään vain harvakseltaan uuden lennon (= uuden kansion) varalta.
// Välitickit pollaavat vain tunnettua tuoreinta kansiota yhdellä pyynnöllä.
const FULL_SCAN_INTERVAL_MS = 60_000;

async function latestInFolder(folder) {
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) {
    console.error('Storage list error:', error.message);
    return null;
  }
  const file = files?.[0];
  if (!file) return null;
  const createdAt = file.created_at ?? file.updated_at ?? '';
  return { path: `${folder}/${file.name}`, createdAt, folder };
}

// Haetaan globaalisti uusin kuva: jokaisesta kansiosta sen tuorein tiedosto
// (created_at desc) ja vertaillaan latausajat keskenään. Näin kansioiden
// nimien lajittelu (esim. "8" > "19" merkkijonona) ei voi valita väärää lentoa.
async function findLatestImage() {
  const { data: folders, error } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 100 });
  if (error) {
    console.error('Storage list error:', error.message);
    return null;
  }
  if (!folders) return null;

  const candidates = await Promise.all(
    folders
      .filter((f) => f.id === null) // vain kansiot (juuren tiedostoilla on id)
      .map((f) => latestInFolder(f.name))
  );
  let newest = null;
  for (const c of candidates) {
    if (c && (!newest || c.createdAt > newest.createdAt)) newest = c;
  }
  return newest;
}

export function useLatestImage() {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastPathRef = useRef(null);
  const currentFolderRef = useRef(null);
  const lastFullScanMsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const now = Date.now();
      let result;
      if (currentFolderRef.current && now - lastFullScanMsRef.current < FULL_SCAN_INTERVAL_MS) {
        result = await latestInFolder(currentFolderRef.current);
      } else {
        result = await findLatestImage();
        lastFullScanMsRef.current = now;
      }
      if (cancelled) return;
      if (result) {
        currentFolderRef.current = result.folder;
        if (result.path !== lastPathRef.current) {
          lastPathRef.current = result.path;
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(result.path);
          setUrl(data.publicUrl);
        }
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
