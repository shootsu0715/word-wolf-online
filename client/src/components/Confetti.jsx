import React from 'react';

// 紙吹雪コンポーネント（App.jsxから切り出し、Result.jsxでも再利用）
export default function Confetti() {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#a855f7', '#ff9ff3', '#48dbfb'];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    duration: Math.random() * 1.5 + 1.5,
  }));

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 999,
      }}>
        {pieces.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: -10,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.size > 8 ? '50%' : '2px',
              animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}
