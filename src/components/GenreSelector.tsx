'use client';

const GENRES = [
  'K-Pop', 'Rock', 'Lo-Fi', 'Classical', 'Hip-Hop',
  'R&B', 'Acoustic', 'Electronic', 'Jazz', 'Cinematic',
] as const;

interface GenreSelectorProps {
  value: string[];
  onChange: (genres: string[]) => void;
}

export default function GenreSelector({ value, onChange }: GenreSelectorProps) {
  const toggle = (genre: string) => {
    const next = value.includes(genre)
      ? value.filter((g) => g !== genre)
      : [...value, genre];
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {GENRES.map((genre) => {
        const selected = value.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            className="btn btn-sm"
            onClick={() => toggle(genre)}
            style={
              selected
                ? { background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }
                : undefined
            }
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
