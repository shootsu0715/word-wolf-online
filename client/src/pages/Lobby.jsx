import React, { useState } from 'react';
import socket from '../socket';
import PlayerList from '../components/PlayerList';

const pageStyle = {
  width: '100%',
  maxWidth: 480,
  textAlign: 'center',
  padding: '20px 0',
};

const codeCardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
};

const roomCodeStyle = {
  fontSize: 48,
  fontWeight: 'bold',
  letterSpacing: 12,
  color: '#FFE66D',
  textShadow: '0 0 20px rgba(255,230,109,0.3)',
  marginBottom: 8,
  userSelect: 'all',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '20px 24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
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

export default function Lobby({ roomCode, players, hostId, myId, onLeave }) {
  const [copied, setCopied] = useState(false);
  const isHost = myId === hostId;
  const canStart = players.length >= 3;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
    }
  };

  const handleStart = () => {
    socket.emit('start_game', { roomCode });
  };

  return (
    <div style={pageStyle}>
      <h2 style={{
        fontSize: 18,
        color: '#aaa',
        marginBottom: 20,
        letterSpacing: 2,
      }}>
        待機ルーム
      </h2>

      {/* ルームコード表示 */}
      <div style={codeCardStyle}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>ルームコード</div>
        <div style={roomCodeStyle} onClick={handleCopy}>{roomCode}</div>
        <button
          onClick={handleCopy}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 20,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {copied ? 'コピーしました！' : 'コードをコピー'}
        </button>
      </div>

      {/* プレイヤーリスト */}
      <div style={cardStyle}>
        <PlayerList players={players} myId={myId} />
      </div>

      {/* ゲーム開始ボタン（ホストのみ） */}
      {isHost && (
        <div style={{ marginBottom: 15 }}>
          <button
            style={canStart ? buttonStyle : buttonDisabledStyle}
            disabled={!canStart}
            onClick={handleStart}
          >
            {canStart ? 'ゲーム開始！' : `あと${3 - players.length}人必要`}
          </button>
        </div>
      )}

      {!isHost && (
        <p style={{ color: '#888', fontSize: 14, marginBottom: 15 }}>
          ホストがゲームを開始するまでお待ちください
        </p>
      )}

      {/* 退出ボタン */}
      <button
        onClick={onLeave}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#888',
          padding: '10px 24px',
          borderRadius: 12,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        ルームを退出
      </button>
    </div>
  );
}
