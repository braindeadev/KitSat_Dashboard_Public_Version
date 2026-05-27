import { useLatestImage } from '../hooks/useLatestImage';

export default function LatestImage() {
  const { url, loading } = useLatestImage();

  if (loading) return <div className="image-empty">LADATAAN…</div>;
  if (!url) return <div className="image-empty">EI KUVIA</div>;

  return (
    <div className="latest-image-wrapper">
      <img src={url} alt="Viimeisin KitSat-kuva" className="latest-image" />
    </div>
  );
}
