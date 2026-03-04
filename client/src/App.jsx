import React, { useState, useEffect } from 'react';
import socket from './socket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import MasterSetup from './pages/MasterSetup';
import Game from './pages/Game';
import Discussion from './pages/Discussion';
import Vote from './pages/Vote';
import Result from './pages/Result';
import Confetti from './components/Confetti';

// グローバルスタイル
const appStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
};

export default function App() {
  // ゲーム状態
  const [phase, setPhase] = useState(null); // null, LOBBY, MASTER_REVEAL, TOPIC_SET, PLAY, DISCUSS, VOTE, RESULT
  const [roomCode, setRoomCode] = useState('');
  const [myId, setMyId] = useState('');
  const [myName, setMyName] = useState('');
  const [hostId, setHostId] = useState('');
  const [players, setPlayers] = useState([]);
  const [gameMasterId, setGameMasterId] = useState('');
  const [gameMasterName, setGameMasterName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // TOPIC_SET用
  const [presetPair, setPresetPair] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [isWaitingForTopics, setIsWaitingForTopics] = useState(false);

  // PLAY用
  const [myTopic, setMyTopic] = useState('');
  const [isWolf, setIsWolf] = useState(false);
  const [wolfCount, setWolfCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [gmAssignments, setGmAssignments] = useState(null);
  const [isGM, setIsGM] = useState(false);

  // DISCUSS用
  const [discussionEndTime, setDiscussionEndTime] = useState(null);

  // VOTE用
  const [voters, setVoters] = useState([]);
  const [votedPlayerIds, setVotedPlayerIds] = useState([]);
  const [votedCount, setVotedCount] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  // RESULT用
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    // 接続時にsocket.idを更新
    socket.on('connect', () => {
      setMyId(socket.id);
    });

    // ルーム作成完了
    socket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setHostId(data.hostId);
      setMyId(data.myId);
      setPhase('LOBBY');
    });

    // ルーム参加完了
    socket.on('room_joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setHostId(data.hostId);
      setMyId(data.myId);
      setPhase('LOBBY');
    });

    // プレイヤー参加通知
    socket.on('player_joined', (data) => {
      setPlayers(data.players);
    });

    // プレイヤー退出通知
    socket.on('player_left', (data) => {
      setPlayers(data.players);
      if (data.hostId) setHostId(data.hostId);
    });

    // プレイヤー更新（接続状態変化）
    socket.on('player_updated', (data) => {
      setPlayers(data.players);
    });

    // ゲーム開始（GM発表）
    socket.on('game_started', (data) => {
      setGameMasterId(data.gameMasterId);
      setGameMasterName(data.gameMasterName);
      setPlayers(data.players);
      setIsGM(socket.id === data.gameMasterId);
      setPhase('MASTER_REVEAL');
    });

    // お題設定画面（GMのみ）
    socket.on('show_topic_setup', (data) => {
      setPlayerCount(data.playerCount);
      setPresetPair(data.presetPair);
      setIsWaitingForTopics(false);
      setPhase('TOPIC_SET');
    });

    // 待機画面（GM以外）
    socket.on('waiting_for_topics', (data) => {
      setGameMasterName(data.gameMasterName);
      setIsWaitingForTopics(true);
      setPhase('TOPIC_SET');
    });

    // お題配布（プレイヤー用）
    socket.on('topics_assigned', (data) => {
      setMyTopic(data.myTopic);
      setIsWolf(data.isWolf);
      setWolfCount(data.wolfCount);
      setTotalPlayers(data.totalPlayers);
      setPlayers(data.players);
      setGmAssignments(null);
      setPhase('PLAY');
    });

    // お題配布（GM用）
    socket.on('topics_assigned_gm', (data) => {
      setGmAssignments(data);
      setWolfCount(data.wolfCount);
      setTotalPlayers(data.totalPlayers);
      setPlayers(data.players);
      setMyTopic('');
      setPhase('PLAY');
    });

    // 議論開始
    socket.on('discussion_started', (data) => {
      setDiscussionEndTime(data.endTime);
      setPhase('DISCUSS');
    });

    // 投票開始
    socket.on('vote_started', (data) => {
      setPlayers(data.players);
      setVoters(data.voters);
      setVotedPlayerIds([]);
      setVotedCount(0);
      setTotalVoters(data.voters.length);
      setHasVoted(false);
      setPhase('VOTE');
    });

    // 投票進捗更新
    socket.on('vote_update', (data) => {
      setVotedPlayerIds(data.votedPlayerIds);
      setVotedCount(data.votedCount);
      setTotalVoters(data.totalVoters);
      // 自分が投票済みかチェック
      setHasVoted(prev => prev || data.votedPlayerIds.includes(socket.id));
    });

    // 結果発表
    socket.on('result_revealed', (data) => {
      setGameResult(data);
      setPhase('RESULT');
    });

    // ゲームリセット
    socket.on('game_reset', (data) => {
      setPlayers(data.players);
      setHostId(data.hostId);
      setGameMasterId('');
      setGameMasterName('');
      setMyTopic('');
      setIsWolf(false);
      setGmAssignments(null);
      setIsGM(false);
      setIsWaitingForTopics(false);
      // 新規フェーズのリセット
      setDiscussionEndTime(null);
      setVoters([]);
      setVotedPlayerIds([]);
      setVotedCount(0);
      setTotalVoters(0);
      setHasVoted(false);
      setGameResult(null);
      setPhase('LOBBY');
    });

    // エラー
    socket.on('error_msg', (data) => {
      setErrorMsg(data.message);
      setTimeout(() => setErrorMsg(''), 3000);
    });

    return () => {
      socket.off('connect');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_updated');
      socket.off('game_started');
      socket.off('show_topic_setup');
      socket.off('waiting_for_topics');
      socket.off('topics_assigned');
      socket.off('topics_assigned_gm');
      socket.off('discussion_started');
      socket.off('vote_started');
      socket.off('vote_update');
      socket.off('result_revealed');
      socket.off('game_reset');
      socket.off('error_msg');
    };
  }, []);

  // ルーム退出
  const handleLeave = () => {
    socket.emit('leave_room');
    setPhase(null);
    setRoomCode('');
    setPlayers([]);
    setGameMasterId('');
    setGameMasterName('');
    setMyTopic('');
    setIsWolf(false);
    setGmAssignments(null);
    setIsGM(false);
    setIsWaitingForTopics(false);
    // 新規フェーズのリセット
    setDiscussionEndTime(null);
    setVoters([]);
    setVotedPlayerIds([]);
    setVotedCount(0);
    setTotalVoters(0);
    setHasVoted(false);
    setGameResult(null);
  };

  return (
    <div style={appStyle}>
      {/* エラー通知 */}
      {errorMsg && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 71, 87, 0.95)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(255,71,87,0.4)',
        }}>
          {errorMsg}
        </div>
      )}

      {/* フェーズに応じた画面切り替え */}
      {phase === null && (
        <Home
          myName={myName}
          setMyName={setMyName}
        />
      )}

      {phase === 'LOBBY' && (
        <Lobby
          roomCode={roomCode}
          players={players}
          hostId={hostId}
          myId={myId}
          onLeave={handleLeave}
        />
      )}

      {phase === 'MASTER_REVEAL' && (
        <MasterRevealScreen
          gameMasterName={gameMasterName}
          players={players}
          myId={myId}
          gameMasterId={gameMasterId}
        />
      )}

      {phase === 'TOPIC_SET' && !isWaitingForTopics && isGM && (
        <MasterSetup
          roomCode={roomCode}
          playerCount={playerCount}
          presetPair={presetPair}
        />
      )}

      {phase === 'TOPIC_SET' && isWaitingForTopics && (
        <WaitingScreen gameMasterName={gameMasterName} />
      )}

      {phase === 'PLAY' && (
        <Game
          myTopic={myTopic}
          isWolf={isWolf}
          isGM={isGM}
          wolfCount={wolfCount}
          totalPlayers={totalPlayers}
          players={players}
          gmAssignments={gmAssignments}
          roomCode={roomCode}
          hostId={hostId}
          myId={myId}
          gameMasterId={gameMasterId}
        />
      )}

      {phase === 'DISCUSS' && (
        <Discussion
          discussionEndTime={discussionEndTime}
          isGM={isGM}
          gmAssignments={gmAssignments}
          myTopic={myTopic}
          players={players}
          myId={myId}
          roomCode={roomCode}
          wolfCount={wolfCount}
          totalPlayers={totalPlayers}
        />
      )}

      {phase === 'VOTE' && (
        <Vote
          voters={voters}
          votedPlayerIds={votedPlayerIds}
          votedCount={votedCount}
          totalVoters={totalVoters}
          hasVoted={hasVoted}
          isGM={isGM}
          myId={myId}
          roomCode={roomCode}
        />
      )}

      {phase === 'RESULT' && (
        <Result
          gameResult={gameResult}
          roomCode={roomCode}
          hostId={hostId}
          myId={myId}
          gameMasterId={gameMasterId}
        />
      )}
    </div>
  );
}

// GM発表演出画面
function MasterRevealScreen({ gameMasterName, players, myId, gameMasterId }) {
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);

  useEffect(() => {
    // ルーレット風演出：プレイヤー名を高速切り替え → 徐々に減速してGMで停止
    if (!isSpinning) return;

    // GMのインデックスを特定
    const gmIndex = players.findIndex(p => p.id === gameMasterId);
    const targetIndex = gmIndex >= 0 ? gmIndex : 0;

    // 減速しながら回転するスケジュールを生成
    // 合計2.5秒程度で、最後にtargetIndexで止まる
    const steps = [];
    let time = 0;
    let idx = 0;
    // 高速フェーズ（80ms間隔で15回）
    for (let i = 0; i < 15; i++) {
      steps.push({ time, index: idx % players.length });
      time += 80;
      idx++;
    }
    // 減速フェーズ（徐々に遅く）
    const slowIntervals = [120, 160, 200, 260, 340, 440];
    for (const interval of slowIntervals) {
      steps.push({ time, index: idx % players.length });
      time += interval;
      idx++;
    }
    // 最後のステップがGMのインデックスになるよう調整
    const lastStepIdx = steps.length > 0 ? steps[steps.length - 1].index : 0;
    const diff = (targetIndex - lastStepIdx + players.length) % players.length;
    for (let i = 0; i < diff; i++) {
      steps.push({ time, index: (lastStepIdx + i + 1) % players.length });
      time += 450 + i * 50;
    }

    const timers = steps.map(step =>
      setTimeout(() => setCurrentIndex(step.index), step.time)
    );

    // 最終ステップの後に結果表示
    const resultTimer = setTimeout(() => {
      setCurrentIndex(targetIndex);
      setIsSpinning(false);
      setShowResult(true);
    }, time + 500);

    return () => {
      timers.forEach(t => clearTimeout(t));
      clearTimeout(resultTimer);
    };
  }, [players, isSpinning, gameMasterId]);

  const isMe = myId === gameMasterId;

  return (
    <div style={{
      textAlign: 'center',
      width: '100%',
      maxWidth: 480,
      padding: '40px 20px',
    }}>
      <h2 style={{
        fontSize: 18,
        color: '#aaa',
        marginBottom: 30,
        letterSpacing: 2,
      }}>
        ゲームマスター選出中...
      </h2>

      {/* ルーレット表示 */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '40px 20px',
        marginBottom: 30,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {!showResult ? (
          <div style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: '#FFE66D',
            minHeight: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.05s',
          }}>
            {players[currentIndex]?.name || ''}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 10 }}>
              ゲームマスターは...
            </div>
            <div style={{
              fontSize: 42,
              fontWeight: 'bold',
              color: '#FFE66D',
              textShadow: '0 0 20px rgba(255,230,109,0.5)',
              marginBottom: 10,
            }}>
              {gameMasterName}
            </div>
            {isMe && (
              <div style={{
                marginTop: 15,
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #FF6B6B, #ee5a24)',
                borderRadius: 20,
                fontSize: 14,
                display: 'inline-block',
              }}>
                あなたがゲームマスターです！
              </div>
            )}
            {/* 紙吹雪 */}
            <Confetti />
          </>
        )}
      </div>

      {showResult && (
        <p style={{ color: '#888', fontSize: 13 }}>
          まもなくお題設定画面に移動します...
        </p>
      )}
    </div>
  );
}

// 待機画面
function WaitingScreen({ gameMasterName }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      textAlign: 'center',
      width: '100%',
      maxWidth: 480,
      padding: '60px 20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(10px)',
        borderRadius: 20,
        padding: '50px 20px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🎭</div>
        <h2 style={{
          fontSize: 20,
          marginBottom: 15,
          color: '#FFE66D',
        }}>
          お題を準備中{dots}
        </h2>
        <p style={{ color: '#aaa', fontSize: 14 }}>
          ゲームマスター <span style={{ color: '#4ECDC4', fontWeight: 'bold' }}>{gameMasterName}</span> がお題を設定しています
        </p>
      </div>
    </div>
  );
}
