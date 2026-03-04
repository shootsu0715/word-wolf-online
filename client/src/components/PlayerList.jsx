import React from 'react';

const containerStyle = {
  width: '100%',
  marginBottom: 20,
};

const titleStyle = {
  fontSize: 13,
  color: '#888',
  marginBottom: 8,
  letterSpacing: 1,
};

const listStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const playerChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 20,
  fontSize: 14,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const hostBadge = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 8,
  background: '#FFE66D',
  color: '#000',
  fontWeight: 'bold',
};

const gmBadge = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 8,
  background: '#4ECDC4',
  color: '#000',
  fontWeight: 'bold',
};

const meBadge = {
  fontSize: 10,
  padding: '2px 6px',
  borderRadius: 8,
  background: '#FF6B6B',
  color: '#fff',
  fontWeight: 'bold',
};

export default function PlayerList({ players, myId, showGM = false }) {
  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        参加者 ({players.length}人)
      </div>
      <div style={listStyle}>
        {players.map((p) => (
          <div key={p.id} style={{
            ...playerChipStyle,
            ...(p.id === myId ? { borderColor: '#FF6B6B' } : {}),
          }}>
            <span>{p.name}</span>
            {p.id === myId && <span style={meBadge}>あなた</span>}
            {p.isHost && <span style={hostBadge}>ホスト</span>}
            {showGM && p.isGM && <span style={gmBadge}>GM</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
