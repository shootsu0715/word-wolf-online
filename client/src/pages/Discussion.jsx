import React, { useState, useEffect } from 'react';
import socket from '../socket';
import PlayerList from '../components/PlayerList';
import TopicReveal from '../components/TopicReveal';

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

const timerStyle = (urgency) => ({
  fontSize: 64,
  fontWeight: 'bold',
  color: urgency === 'critical' ? '#FF6B6B' : urgency === 'warning' ? '#FFE66D' : '#4ECDC4',
  textShadow: urgency === 'critical' ? '0 0 20px rgba(255,107,107,0.6)' : 'none',
  animation: urgency === 'critical' ? 'timer-blink 0.5s ease-in-out infinite alternate' : 'none',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 2,
});

const gmTableStyle = {
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

const endButtonStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: 1,
};

export default function Discussion({
  discussionEndTime,
  isGM,
  gmAssignments,
  myTopic,
  players,
  myId,
  roomCode,
  wolfCount,
  totalPlayers,
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, discussionEndTime - Date.now());
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [discussionEndTime]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const urgency = totalSeconds <= 10 ? 'critical' : totalSeconds <= 30 ? 'warning' : 'normal';

  const handleEndDiscussion = () => {
    socket.emit('end_discussion', { roomCode });
  };

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes timer-blink {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }
      `}</style>

      <h2 style={{ fontSize: 20, marginBottom: 5 }}>議論タイム</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
        みんなで話し合ってウルフを見つけよう！
      </p>

      {/* タイマー */}
      <div style={{
        ...cardStyle,
        padding: '30px 24px',
      }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>残り時間</div>
        <div style={timerStyle(urgency)}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* GM画面 */}
      {isGM && gmAssignments && (
        <>
          {/* お題情報 */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 15 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>多数派</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#4ECDC4' }}>
                  {gmAssignments.majorityTopic}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>少数派</div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FF6B6B' }}>
                  {gmAssignments.wolfTopic}
                </div>
              </div>
            </div>
          </div>

          {/* 役割一覧 */}
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              役割一覧（GMのみ表示）
            </div>
            <table style={gmTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>プレイヤー</th>
                  <th style={thStyle}>お題</th>
                  <th style={thStyle}>役割</th>
                </tr>
              </thead>
              <tbody>
                {gmAssignments.assignments.map((a, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{a.playerName}</td>
                    <td style={{
                      ...tdStyle,
                      color: a.isWolf ? '#FF6B6B' : '#4ECDC4',
                      fontWeight: 'bold',
                    }}>
                      {a.topic}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 8,
                        fontSize: 12,
                        background: a.isWolf ? 'rgba(255,107,107,0.2)' : 'rgba(78,205,196,0.2)',
                        color: a.isWolf ? '#FF6B6B' : '#4ECDC4',
                      }}>
                        {a.isWolf ? 'ウルフ' : '市民'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 議論終了ボタン */}
          <button style={endButtonStyle} onClick={handleEndDiscussion}>
            議論を終了して投票へ
          </button>
        </>
      )}

      {/* プレイヤー画面 */}
      {!isGM && (
        <>
          {/* お題確認カード */}
          <div style={{ marginBottom: 20 }}>
            <TopicReveal topic={myTopic} />
          </div>

          {/* プレイヤーリスト */}
          <div style={cardStyle}>
            <PlayerList players={players} myId={myId} showGM={true} />
          </div>
        </>
      )}
    </div>
  );
}
