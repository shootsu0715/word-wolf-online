import React from 'react';
import PlayerList from '../components/PlayerList';
import TopicReveal from '../components/TopicReveal';

const pageStyle = {
  width: '100%',
  maxWidth: 480,
  padding: '20px 0',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '20px 24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
};

const infoRowStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: 20,
  marginBottom: 20,
};

const infoBadgeStyle = (color) => ({
  padding: '8px 18px',
  borderRadius: 12,
  background: `rgba(${color}, 0.15)`,
  border: `1px solid rgba(${color}, 0.3)`,
  fontSize: 14,
  fontWeight: 'bold',
  textAlign: 'center',
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

export default function Game({
  myTopic,
  isWolf,
  isGM,
  wolfCount,
  totalPlayers,
  players,
  gmAssignments,
  roomCode,
  hostId,
  myId,
  gameMasterId,
}) {
  return (
    <div style={pageStyle}>
      {/* GM画面 */}
      {isGM && gmAssignments && (
        <>
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: 20,
              background: '#4ECDC4',
              color: '#000',
              fontSize: 13,
              fontWeight: 'bold',
              marginBottom: 10,
            }}>
              ゲームマスター
            </div>
            <h2 style={{ fontSize: 20 }}>ゲーム進行中</h2>
          </div>

          {/* 人数情報 */}
          <div style={infoRowStyle}>
            <div style={infoBadgeStyle('78,205,196')}>
              <div style={{ color: '#4ECDC4' }}>市民 {totalPlayers - wolfCount}人</div>
            </div>
            <div style={infoBadgeStyle('255,107,107')}>
              <div style={{ color: '#FF6B6B' }}>ウルフ {wolfCount}人</div>
            </div>
          </div>

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

          {/* 全員の役割（GM専用） */}
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
        </>
      )}

      {/* プレイヤー画面 */}
      {!isGM && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>ゲーム進行中</h2>
            <p style={{ color: '#888', fontSize: 13 }}>
              口頭で議論してウルフを見つけ出そう！
            </p>
          </div>

          {/* 人数情報 */}
          <div style={infoRowStyle}>
            <div style={infoBadgeStyle('78,205,196')}>
              <div style={{ color: '#4ECDC4' }}>市民 {totalPlayers - wolfCount}人</div>
            </div>
            <div style={infoBadgeStyle('255,107,107')}>
              <div style={{ color: '#FF6B6B' }}>ウルフ {wolfCount}人</div>
            </div>
          </div>

          {/* お題確認カード */}
          <div style={{ marginBottom: 20 }}>
            <TopicReveal topic={myTopic} />
          </div>
        </>
      )}

      {/* プレイヤーリスト */}
      <div style={cardStyle}>
        <PlayerList players={players} myId={myId} showGM={true} />
      </div>

      {/* 議論開始待ちメッセージ */}
      <div style={{
        padding: '14px',
        borderRadius: 12,
        background: 'rgba(255,230,109,0.1)',
        border: '1px solid rgba(255,230,109,0.3)',
        color: '#FFE66D',
        fontSize: 14,
        textAlign: 'center',
      }}>
        お題を確認してください。まもなく議論が始まります...
      </div>
    </div>
  );
}
