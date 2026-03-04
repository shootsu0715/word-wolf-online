import React, { useState } from 'react';
import socket from '../socket';

const pageStyle = {
  width: '100%',
  maxWidth: 480,
  textAlign: 'center',
  padding: '40px 0',
};

const titleStyle = {
  fontSize: 36,
  fontWeight: 'bold',
  background: 'linear-gradient(135deg, #FF6B6B, #FFE66D)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: 8,
};

const subtitleStyle = {
  fontSize: 14,
  color: '#888',
  marginBottom: 40,
  letterSpacing: 2,
};

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '30px 24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
};

const inputStyle = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 16,
  outline: 'none',
  marginBottom: 12,
  transition: 'border-color 0.2s',
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s',
  letterSpacing: 1,
};

const buttonDisabledStyle = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #4ECDC4, #2d9a93)',
};

const sectionLabelStyle = {
  fontSize: 13,
  color: '#888',
  marginBottom: 12,
  letterSpacing: 1,
};

const dividerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  margin: '10px 0',
  color: '#555',
  fontSize: 13,
};

const lineStyle = {
  flex: 1,
  height: 1,
  background: 'rgba(255,255,255,0.1)',
};

export default function Home({ myName, setMyName }) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const canCreate = myName.trim() && !isCreating && !isJoining;
  const canJoin = myName.trim() && roomCodeInput.trim() && !isCreating && !isJoining;

  const handleCreate = () => {
    if (!canCreate) return;
    setIsCreating(true);
    socket.emit('create_room', { playerName: myName.trim() });
    setTimeout(() => setIsCreating(false), 3000);
  };

  const handleJoin = () => {
    if (!canJoin) return;
    setIsJoining(true);
    socket.emit('join_room', {
      roomCode: roomCodeInput.trim().toUpperCase(),
      playerName: myName.trim(),
    });
    setTimeout(() => setIsJoining(false), 3000);
  };

  return (
    <div style={pageStyle}>
      <div style={titleStyle}>ワードウルフ</div>
      <div style={subtitleStyle}>WORD WOLF ONLINE</div>

      {/* 名前入力 */}
      <div style={cardStyle}>
        <input
          style={inputStyle}
          placeholder="あなたの名前"
          value={myName}
          onChange={e => setMyName(e.target.value)}
          maxLength={10}
          onFocus={e => e.target.style.borderColor = '#FF6B6B'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
        />
      </div>

      {/* ルームを作るセクション */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>ルームを作る</div>
        <button
          style={canCreate ? buttonStyle : buttonDisabledStyle}
          disabled={!canCreate}
          onClick={handleCreate}
        >
          {isCreating ? '作成中...' : 'ルームを作成'}
        </button>
      </div>

      {/* 区切り線 */}
      <div style={dividerStyle}>
        <div style={lineStyle} />
        <span>or</span>
        <div style={lineStyle} />
      </div>

      {/* ルームに参加セクション */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>ルームに参加</div>
        <input
          style={{
            ...inputStyle,
            textAlign: 'center',
            fontSize: 24,
            letterSpacing: 8,
            textTransform: 'uppercase',
          }}
          placeholder="コード"
          value={roomCodeInput}
          onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
          maxLength={4}
          onFocus={e => e.target.style.borderColor = '#4ECDC4'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
        />
        <button
          style={canJoin ? secondaryButtonStyle : { ...secondaryButtonStyle, opacity: 0.5, cursor: 'not-allowed' }}
          disabled={!canJoin}
          onClick={handleJoin}
        >
          {isJoining ? '参加中...' : '参加する'}
        </button>
      </div>

      <p style={{ color: '#555', fontSize: 12 }}>
        3〜10人で遊べます
      </p>
    </div>
  );
}
