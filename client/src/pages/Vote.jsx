import React from 'react';
import socket from '../socket';

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

const voteButtonStyle = (disabled) => ({
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
  color: disabled ? '#555' : '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: disabled ? 'not-allowed' : 'pointer',
  marginBottom: 10,
  transition: 'all 0.2s',
});

const progressBarBgStyle = {
  width: '100%',
  height: 8,
  borderRadius: 4,
  background: 'rgba(255,255,255,0.1)',
  overflow: 'hidden',
  marginTop: 12,
};

export default function Vote({
  voters,
  votedPlayerIds,
  votedCount,
  totalVoters,
  hasVoted,
  isGM,
  myId,
  roomCode,
}) {
  const progress = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

  const handleVote = (targetId) => {
    socket.emit('cast_vote', { roomCode, targetId });
  };

  // 投票対象: 自分以外のvoters
  const targets = voters.filter(v => v.id !== myId);

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 20, marginBottom: 5 }}>投票タイム</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        ウルフだと思う人に投票しよう！
      </p>

      {/* GM画面: 進捗確認のみ */}
      {isGM && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 10 }}>
            投票進捗
          </div>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#FFE66D' }}>
            {votedCount} / {totalVoters}
          </div>
          <div style={progressBarBgStyle}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #4ECDC4, #FFE66D)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 10 }}>
            全員の投票が完了すると結果が発表されます
          </div>
        </div>
      )}

      {/* プレイヤー: 未投票 */}
      {!isGM && !hasVoted && (
        <div style={cardStyle}>
          <div style={{ fontSize: 14, color: '#aaa', marginBottom: 15 }}>
            ウルフだと思う人をタップ
          </div>
          {targets.map(v => (
            <button
              key={v.id}
              style={voteButtonStyle(false)}
              onClick={() => handleVote(v.id)}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* プレイヤー: 投票済み */}
      {!isGM && hasVoted && (
        <div style={{
          ...cardStyle,
          padding: '40px 24px',
        }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#4ECDC4', marginBottom: 10 }}>
            投票完了！
          </div>
          <div style={{ fontSize: 13, color: '#888' }}>
            他のプレイヤーの投票を待っています...
          </div>
        </div>
      )}

      {/* 投票進捗（プレイヤー共通） */}
      {!isGM && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            投票進捗: {votedCount} / {totalVoters}
          </div>
          <div style={progressBarBgStyle}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #4ECDC4, #FFE66D)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          {/* 投票済みプレイヤーリスト */}
          {votedPlayerIds.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {voters.filter(v => votedPlayerIds.includes(v.id)).map(v => (
                <span key={v.id} style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  background: 'rgba(78,205,196,0.15)',
                  border: '1px solid rgba(78,205,196,0.3)',
                  fontSize: 12,
                  color: '#4ECDC4',
                }}>
                  {v.name} ✓
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
