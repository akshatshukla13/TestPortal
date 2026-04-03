export function SkeletonBlock({ className = '', style }) {
  return (
    <div
      className={`skeleton-block${className ? ' ' + className : ''}`}
      style={style}
    />
  );
}

export function SkeletonText({ width = '100%', height = '0.9rem' }) {
  return <SkeletonBlock style={{ width, height, borderRadius: '5px' }} />;
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: '14px',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <SkeletonBlock style={{ height: '1.1rem', width: '58%', borderRadius: '6px' }} />
        <SkeletonBlock style={{ height: '1.1rem', width: '22%', borderRadius: '999px' }} />
      </div>

      <div
        style={{
          background: 'var(--card-soft)',
          borderRadius: '12px',
          padding: '0.75rem',
          marginBottom: '0.75rem',
          display: 'grid',
          gap: '0.45rem',
        }}
      >
        {[80, 65, 45].map((w, i) => (
          <SkeletonBlock
            key={i}
            style={{ height: '0.82rem', width: `${w}%`, borderRadius: '5px' }}
          />
        ))}
      </div>

      <SkeletonBlock style={{ height: '2.2rem', width: '100%', borderRadius: '10px' }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <SkeletonBlock style={{ width: '40%', height: '0.95rem', borderRadius: '5px' }} />
      <SkeletonBlock style={{ width: '18%', height: '0.88rem', borderRadius: '5px', marginLeft: 'auto' }} />
      <SkeletonBlock style={{ width: '14%', height: '0.88rem', borderRadius: '5px' }} />
    </div>
  );
}
