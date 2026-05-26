import { useLatestImage } from '../hooks/useLatestImage';

export default function LatestImage() {
  const { url, loading } = useLatestImage();

  if (loading) return <div className="image-empty">LOADING…</div>;
  if (!url) return <div className="image-empty">NO IMAGES</div>;

  return (
    <div className="latest-image-wrapper">
      <img src={url} alt="Latest KitSat capture" className="latest-image" />
    </div>
  );
}
