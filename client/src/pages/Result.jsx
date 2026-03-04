import React from 'react';
import socket from '../socket';
import Confetti from '../components/Confetti';

const pageStyle = {
  width: '100%',
  maxWidth: 480,
  padding: '20px 0',
  textAlign: 'center',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '20px 24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  color: '#888',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  fontSize: 12,
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #4ECDC4, #2d9a93)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: 1,
};

export default function Result({
  gameResult,
  roomCode,
  hostId,
  myId,
  gameMasterId,
}) {
  if (!gameResult) return null;

  const { results, isTie, wolfWins, majorityTopic, wolfTopic, wolves } = gameResult;
  const canControl = myId === hostId || myId === gameMasterId;
  const citizenWins = !wolfWins;

  const handleRestart = () => {
    socket.emit('restart_game', { roomCode });
  };

  return (
    <div style={pageStyle}>
      {/* 市民勝利時の紙吹雪 */}
      {citizenWins && <Confetti />}

      {/* 勝敗バナー */}
      <div style={{
        ...cardStyle,
        padding: '30px 24px',
        background: wolfWins
          ? 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(238,90,36,0.2))'
          : 'linear-gradient(135deg, rgba(78,205,196,0.2), rgba(45,154,147,0.2))',
        borderColor: wolfWins ? 'rgba(255,107,107,0.4)' : 'rgba(78,205,196,0.4)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>
          {wolfWins ? '🐺' : '🎉'}
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: wolfWins ? '#FF6B6B' : '#4ECDC4',
          marginBottom: 8,
        }}>
          {wolfWins ? 'ウルフの勝利！' : '市民の勝利！'}
        </div>
        {isTie && (
          <div style={{ fontSize: 13, color: '#aaa' }}>
            同票のためウルフの勝利
          </div>
        )}
      </div>

      {/* お題公開 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 15 }}>お題公開</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>多数派（市民）</div>
            <div style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#4ECDC4',
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(78,205,196,0.1)',
            }}>
              {majorityTopic}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>少数派（ウルフ）</div>
            <div style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#FF6B6B',
              padding: '8px 16px',
              borderRadius: 12,
              background: 'rgba(255,107,107,0.1)',
            }}>
              {wolfTopic}
            </div>
          </div>
        </div>
      </div>

      {/* ウルフの正体 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>ウルフの正体</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {wolves.map((w, i) => (
            <span key={i} style={{
              padding: '8px 18px',
              borderRadius: 20,
              background: 'rgba(255,107,107,0.2)',
              border: '1px solid rgba(255,107,107,0.4)',
              color: '#FF6B6B',
              fontWeight: 'bold',
              fontSize: 16,
            }}>
              🐺 {w.playerName}
            </span>
          ))}
        </div>
      </div>

      {/* 投票結果テーブル */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>投票結果</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>プレイヤー</th>
              <th style={thStyle}>得票</th>
              <th style={thStyle}>役割</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  {r.playerName}
                </td>
                <td style={{
                  ...tdStyle,
                  fontWeight: 'bold',
                  color: '#FFE66D',
                  fontSize: 18,
                }}>
                  {r.voteCount}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    background: r.isWolf ? 'rgba(255,107,107,0.2)' : 'rgba(78,205,196,0.2)',
                    color: r.isWolf ? '#FF6B6B' : '#4ECDC4',
                  }}>
                    {r.isWolf ? 'ウルフ' : '市民'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* もう一度遊ぶボタン */}
      {canControl && (
        <button style={buttonStyle} onClick={handleRestart}>
          もう一度遊ぶ
        </button>
      )}
    </div>
  );
}
