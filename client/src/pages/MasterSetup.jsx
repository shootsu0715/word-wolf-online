import React, { useState } from 'react';
import socket from '../socket';

const pageStyle = {
  width: '100%',
  maxWidth: 480,
  textAlign: 'center',
  padding: '20px 0',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  borderRadius: 20,
  padding: '24px',
  marginBottom: 20,
  border: '1px solid rgba(255,255,255,0.1)',
  textAlign: 'left',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 16,
  outline: 'none',
  marginBottom: 12,
};

const labelStyle = {
  fontSize: 13,
  color: '#aaa',
  marginBottom: 6,
  display: 'block',
};

const toggleContainerStyle = {
  display: 'flex',
  gap: 0,
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.15)',
  marginBottom: 20,
};

const toggleButtonStyle = (active) => ({
  flex: 1,
  padding: '12px',
  border: 'none',
  background: active ? 'linear-gradient(135deg, #FF6B6B, #ee5a24)' : 'rgba(255,255,255,0.05)',
  color: active ? '#fff' : '#888',
  fontSize: 14,
  fontWeight: active ? 'bold' : 'normal',
  cursor: 'pointer',
  transition: 'all 0.2s',
});

const presetDisplayStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  padding: '20px 0',
  marginBottom: 12,
};

const topicBoxStyle = {
  padding: '12px 20px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.1)',
  fontSize: 18,
  fontWeight: 'bold',
  textAlign: 'center',
  minWidth: 100,
};

const shuffleButtonStyle = {
  background: 'rgba(78,205,196,0.2)',
  border: '1px solid rgba(78,205,196,0.4)',
  color: '#4ECDC4',
  padding: '10px 20px',
  borderRadius: 12,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const counterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  marginTop: 8,
};

const counterBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  fontSize: 20,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const submitButtonStyle = {
  width: '100%',
  padding: '16px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
  cursor: 'pointer',
  letterSpacing: 2,
  transition: 'all 0.2s',
};

export default function MasterSetup({ roomCode, playerCount, presetPair }) {
  const [usePreset, setUsePreset] = useState(true);
  const [majorityTopic, setMajorityTopic] = useState(presetPair?.majorityTopic || '');
  const [wolfTopic, setWolfTopic] = useState(presetPair?.wolfTopic || '');
  const [wolfCount, setWolfCount] = useState(1);
  const [discussionMinutes, setDiscussionMinutes] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxWolf = Math.max(1, playerCount - 2);

  const handleShuffle = () => {
    socket.emit('shuffle_preset', null, (pair) => {
      setMajorityTopic(pair.majorityTopic);
      setWolfTopic(pair.wolfTopic);
    });
  };

  const handleSubmit = () => {
    const mTopic = usePreset ? majorityTopic : majorityTopic.trim();
    const wTopic = usePreset ? wolfTopic : wolfTopic.trim();
    if (!mTopic || !wTopic) return;
    setIsSubmitting(true);
    socket.emit('set_topics', {
      roomCode,
      majorityTopic: mTopic,
      wolfTopic: wTopic,
      wolfCount,
      discussionMinutes,
    });
  };

  return (
    <div style={pageStyle}>
      <div style={{
        display: 'inline-block',
        padding: '6px 16px',
        borderRadius: 20,
        background: '#4ECDC4',
        color: '#000',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 20,
      }}>
        ゲームマスター
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 20 }}>お題を設定</h2>

      {/* モード切り替え */}
      <div style={cardStyle}>
        <div style={toggleContainerStyle}>
          <button
            style={toggleButtonStyle(usePreset)}
            onClick={() => setUsePreset(true)}
          >
            おまかせ
          </button>
          <button
            style={toggleButtonStyle(!usePreset)}
            onClick={() => setUsePreset(false)}
          >
            自分で入力
          </button>
        </div>

        {usePreset ? (
          <>
            <div style={presetDisplayStyle}>
              <div style={{ ...topicBoxStyle, color: '#4ECDC4' }}>{majorityTopic}</div>
              <span style={{ color: '#555', fontSize: 14 }}>vs</span>
              <div style={{ ...topicBoxStyle, color: '#FF6B6B' }}>{wolfTopic}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button style={shuffleButtonStyle} onClick={handleShuffle}>
                🔀 シャッフル
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#666' }}>
              左が多数派、右が少数派（ウルフ）のお題です
            </div>
          </>
        ) : (
          <>
            <label style={labelStyle}>多数派ワード（市民のお題）</label>
            <input
              style={inputStyle}
              placeholder="例: ラーメン"
              value={majorityTopic}
              onChange={e => setMajorityTopic(e.target.value)}
              maxLength={20}
            />
            <label style={labelStyle}>少数派ワード（ウルフのお題）</label>
            <input
              style={inputStyle}
              placeholder="例: うどん"
              value={wolfTopic}
              onChange={e => setWolfTopic(e.target.value)}
              maxLength={20}
            />
          </>
        )}
      </div>

      {/* ウルフ人数設定 */}
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, textAlign: 'center' }}>ウルフの人数</label>
        </div>
        <div style={counterStyle}>
          <button
            style={{
              ...counterBtnStyle,
              opacity: wolfCount <= 1 ? 0.3 : 1,
            }}
            disabled={wolfCount <= 1}
            onClick={() => setWolfCount(c => Math.max(1, c - 1))}
          >
            −
          </button>
          <span style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#FF6B6B',
            minWidth: 50,
            textAlign: 'center',
          }}>
            {wolfCount}
          </span>
          <button
            style={{
              ...counterBtnStyle,
              opacity: wolfCount >= maxWolf ? 0.3 : 1,
            }}
            disabled={wolfCount >= maxWolf}
            onClick={() => setWolfCount(c => Math.min(maxWolf, c + 1))}
          >
            +
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#666', marginTop: 8 }}>
          参加者 {playerCount}人中（最大 {maxWolf}人まで）
        </div>
      </div>

      {/* 議論時間設定 */}
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, textAlign: 'center' }}>議論時間</label>
        </div>
        <div style={counterStyle}>
          <button
            style={{
              ...counterBtnStyle,
              opacity: discussionMinutes <= 1 ? 0.3 : 1,
            }}
            disabled={discussionMinutes <= 1}
            onClick={() => setDiscussionMinutes(m => Math.max(1, m - 1))}
          >
            −
          </button>
          <span style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#FFE66D',
            minWidth: 80,
            textAlign: 'center',
          }}>
            {discussionMinutes}<span style={{ fontSize: 16, color: '#aaa' }}>分</span>
          </span>
          <button
            style={{
              ...counterBtnStyle,
              opacity: discussionMinutes >= 10 ? 0.3 : 1,
            }}
            disabled={discussionMinutes >= 10}
            onClick={() => setDiscussionMinutes(m => Math.min(10, m + 1))}
          >
            +
          </button>
        </div>
      </div>

      {/* お題配布ボタン */}
      <button
        style={{
          ...submitButtonStyle,
          opacity: isSubmitting || !majorityTopic || !wolfTopic ? 0.5 : 1,
          cursor: isSubmitting || !majorityTopic || !wolfTopic ? 'not-allowed' : 'pointer',
        }}
        disabled={isSubmitting || !majorityTopic || !wolfTopic}
        onClick={handleSubmit}
      >
        {isSubmitting ? '配布中...' : 'お題を配る'}
      </button>
    </div>
  );
}
