/**
 * "Antlertee × Spotify" lockup, drawn here (not cropped from a photo): our stag-and-wordmark logo (the same
 * CSS-mask file the nav uses), a multiplication sign, and the Spotify glyph with its name set in Gabarito.
 */
function SpotifyGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="cl-glyph">
      <circle cx="12" cy="12" r="12" fill="#1ed760" />
      <g fill="none" stroke="#000" strokeLinecap="round">
        <path d="M5.4 8.5C10.4 7 15.8 7.5 19.5 9.8" strokeWidth="2" />
        <path d="M6.2 12.1C10.3 10.9 14.5 11.3 17.7 13.1" strokeWidth="1.65" />
        <path d="M7 15.4C10.2 14.5 13.4 14.8 16 16.2" strokeWidth="1.35" />
      </g>
    </svg>
  );
}

export function CollabLockup() {
  return (
    <div className="cl" role="img" aria-label="Antlertee Creative Studios times Spotify">
      <span className="cl-ant" aria-hidden="true" />
      <span className="cl-x" aria-hidden="true">
        ×
      </span>
      <span className="cl-spot" aria-hidden="true">
        <SpotifyGlyph />
        <span className="cl-name">Spotify</span>
      </span>
    </div>
  );
}
