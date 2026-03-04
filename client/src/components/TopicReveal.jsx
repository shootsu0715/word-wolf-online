import React, { useState } from 'react';

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '30px 20px',
  textAlign: 'center',
  border: '1px solid rgba(255,255,255,0.1)',
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'all 0.3s ease',
  width: '100%',
};

const topicStyle = {
  fontSize: 32,
  fontWeight: 'bold',
  color: '#fff',
  textShadow: '0 0 20px rgba(255,255,255,0.2)',
  marginTop: 10,
};

const hiddenStyle = {
  fontSize: 16,
  color: '#aaa',
  marginTop: 10,
};

export default function TopicReveal({ topic }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div
      style={{
        ...cardStyle,
        ...(isRevealed ? {
          background: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(78,205,196,0.5)',
          boxShadow: '0 0 30px rgba(78,205,196,0.15)',
        } : {}),
      }}
      onClick={() => setIsRevealed(!isRevealed)}
    >
      <div style={{ fontSize: 14, color: '#888', marginBottom: 5 }}>
        あなたのお題
      </div>
      {isRevealed ? (
        <>
          <div style={topicStyle}>{topic}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
            タップで隠す
          </div>
        </>
      ) : (
        <>
          <div style={hiddenStyle}>タップして確認</div>
          <div style={{ fontSize: 40, marginTop: 5 }}>🔒</div>
        </>
      )}
    </div>
  );
}
