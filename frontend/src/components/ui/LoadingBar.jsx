import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

export default function LoadingBar() {
  const pendingRequests = useSelector((state) => state.ui.pendingRequests);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'loading' | 'completing'
  const phaseRef = useRef('idle');
  const tickRef = useRef(null);
  const doneRef = useRef(null);

  // Keep ref in sync for safe use inside effects without adding `phase` to deps
  phaseRef.current = phase;

  useEffect(() => {
    if (pendingRequests > 0) {
      // Cancel any pending "complete" animation
      clearTimeout(doneRef.current);

      if (phaseRef.current === 'idle') {
        setProgress(8);
        setPhase('loading');
        phaseRef.current = 'loading';
      }

      // Crawl toward 88%
      clearInterval(tickRef.current);
      tickRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            clearInterval(tickRef.current);
            return 88;
          }
          return prev + (88 - prev) * 0.07;
        });
      }, 250);
    } else if (phaseRef.current === 'loading') {
      clearInterval(tickRef.current);
      setPhase('completing');
      phaseRef.current = 'completing';
      setProgress(100);

      doneRef.current = setTimeout(() => {
        setPhase('idle');
        phaseRef.current = 'idle';
        setProgress(0);
      }, 450);
    }

    return () => {
      clearInterval(tickRef.current);
      clearTimeout(doneRef.current);
    };
  }, [pendingRequests]);

  const isVisible = phase !== 'idle';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className="loading-bar-track"
        style={{
          height: '100%',
          width: `${progress}%`,
          transition:
            phase === 'completing'
              ? 'width 0.35s cubic-bezier(0.4,0,0.2,1)'
              : 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
      {/* Glow dot at the leading edge */}
      {phase === 'loading' && (
        <div
          className="loading-bar-glow"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      )}
    </div>
  );
}
