require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameManager = require('./gameManager');
const { getRandomPair } = require('./topicPairs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://word-wolf-online.onrender.com',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

const gm = new GameManager();

// 本番時は静的ファイルを配信
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Socket.IO 接続処理
io.on('connection', (socket) => {
  console.log(`[接続] id=${socket.id}, transport=${socket.conn.transport.name}`);

  // トランスポートのアップグレード監視
  socket.conn.on('upgrade', (transport) => {
    console.log(`[アップグレード] id=${socket.id}, ${transport.name}`);
  });

  // ルーム作成
  socket.on('create_room', ({ playerName }, callback) => {
    console.log(`[create_room] player=${playerName}, socketId=${socket.id}`);
    const room = gm.createRoom(socket.id, playerName);
    socket.join(room.code);
    const response = {
      roomCode: room.code,
      players: gm.getPlayerList(room),
      hostId: room.hostId,
      myId: socket.id,
    };
    console.log(`[create_room] ルーム作成完了: ${room.code}`);
    if (callback) callback(response);
    socket.emit('room_created', response);
  });

  // ルーム参加
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    console.log(`[join_room] player=${playerName}, room=${roomCode}, socketId=${socket.id}`);
    const result = gm.joinRoom(socket.id, roomCode.toUpperCase(), playerName);
    if (result.error) {
      console.log(`[join_room] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      if (callback) callback({ error: result.error });
      return;
    }
    const room = result.room;
    socket.join(room.code);
    const players = gm.getPlayerList(room);
    const response = {
      roomCode: room.code,
      players,
      hostId: room.hostId,
      myId: socket.id,
    };
    console.log(`[join_room] 参加完了: room=${room.code}, 現在${players.length}人`);
    if (callback) callback(response);
    socket.emit('room_joined', response);
    // 他のプレイヤーに通知
    socket.to(room.code).emit('player_joined', { players });
  });

  // ゲーム開始
  socket.on('start_game', ({ roomCode }) => {
    console.log(`[start_game] room=${roomCode}, requesterId=${socket.id}`);
    const result = gm.startGame(roomCode, socket.id);
    if (result.error) {
      console.log(`[start_game] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    const gmPlayer = room.players.find(p => p.id === room.gameMasterId);
    console.log(`[start_game] GM選出: ${gmPlayer ? gmPlayer.name : '不明'} (id=${room.gameMasterId})`);
    // 全員にGM発表
    io.to(roomCode).emit('game_started', {
      gameMasterId: room.gameMasterId,
      gameMasterName: gmPlayer ? gmPlayer.name : '',
      players: gm.getPlayerList(room),
    });

    // 3秒後にお題設定フェーズへ遷移（演出時間）
    setTimeout(() => {
      const currentRoom = gm.getRoom(roomCode);
      if (!currentRoom) {
        console.log(`[start_game] タイマー発火時にルームが存在しない: ${roomCode}`);
        return;
      }
      gm.proceedToTopicSet(roomCode);
      console.log(`[start_game] TOPIC_SETフェーズへ遷移, GM=${room.gameMasterId}`);
      // GMにはお題設定画面、他は待機画面
      io.to(room.gameMasterId).emit('show_topic_setup', {
        playerCount: room.players.filter(p => p.id !== room.gameMasterId && p.isConnected).length,
        presetPair: getRandomPair(),
      });
      // GM以外に待機指示
      room.players
        .filter(p => p.id !== room.gameMasterId && p.isConnected)
        .forEach(p => {
          console.log(`[start_game] waiting_for_topics送信: ${p.id}`);
          io.to(p.id).emit('waiting_for_topics', {
            gameMasterName: gmPlayer ? gmPlayer.name : '',
          });
        });
    }, 3500);
  });

  // プリセットシャッフル（GMがシャッフルボタンを押した時）
  socket.on('shuffle_preset', (_, callback) => {
    const pair = getRandomPair();
    if (callback) callback(pair);
  });

  // お題設定
  socket.on('set_topics', ({ roomCode, majorityTopic, wolfTopic, wolfCount, discussionMinutes }) => {
    console.log(`[set_topics] room=${roomCode}, majority=${majorityTopic}, wolf=${wolfTopic}, wolfCount=${wolfCount}, minutes=${discussionMinutes}`);
    console.log(`[set_topics] 送信者socketId=${socket.id}`);
    const result = gm.setTopics(roomCode, socket.id, { majorityTopic, wolfTopic, wolfCount, discussionMinutes });
    if (result.error) {
      console.log(`[set_topics] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    const playerList = gm.getPlayerList(room);
    const gamePlayers = room.players.filter(p => p.id !== room.gameMasterId && p.isConnected);
    console.log(`[set_topics] お題設定成功, assignments=${room.assignments.length}件, gamePlayers=${gamePlayers.length}人`);

    // 各プレイヤーに個別にお題を送信（重要：broadcastしない）
    room.assignments.forEach(a => {
      console.log(`[set_topics] topics_assigned送信: playerId=${a.playerId}, topic=${a.topic}, isWolf=${a.isWolf}`);
      io.to(a.playerId).emit('topics_assigned', {
        myTopic: a.topic,
        isWolf: a.isWolf,
        wolfCount: room.settings.wolfCount,
        totalPlayers: gamePlayers.length,
        players: playerList,
      });
    });

    // GMには全体情報を送信（進行用）
    console.log(`[set_topics] topics_assigned_gm送信: gmId=${room.gameMasterId}`);
    io.to(room.gameMasterId).emit('topics_assigned_gm', {
      assignments: room.assignments.map(a => ({
        playerName: a.playerName,
        topic: a.topic,
        isWolf: a.isWolf,
      })),
      wolfCount: room.settings.wolfCount,
      totalPlayers: gamePlayers.length,
      players: playerList,
      majorityTopic: room.settings.majorityTopic,
      wolfTopic: room.settings.wolfTopic,
    });

    // 10秒後に議論フェーズへ自動遷移
    setTimeout(() => {
      const currentRoom = gm.getRoom(roomCode);
      if (!currentRoom || currentRoom.phase !== 'PLAY') {
        console.log(`[set_topics] 議論遷移スキップ: room=${roomCode}, phase=${currentRoom ? currentRoom.phase : '不明'}`);
        return;
      }
      const discResult = gm.startDiscussion(roomCode);
      if (!discResult) {
        console.log(`[set_topics] startDiscussion失敗: room=${roomCode}`);
        return;
      }
      console.log(`[set_topics] 議論開始: room=${roomCode}, duration=${discResult.durationMs}ms`);
      io.to(roomCode).emit('discussion_started', {
        endTime: discResult.endTime,
        durationMs: discResult.durationMs,
      });
      // タイマー満了で自動的に投票フェーズへ
      currentRoom.discussionTimer = setTimeout(() => {
        const r = gm.getRoom(roomCode);
        if (!r || r.phase !== 'DISCUSS') return;
        console.log(`[set_topics] 議論時間終了 → 投票フェーズ: room=${roomCode}`);
        const endResult = gm.endDiscussion(roomCode, null);
        if (endResult.error) return;
        const pl = gm.getPlayerList(endResult.room);
        io.to(roomCode).emit('vote_started', {
          players: pl,
          voters: endResult.voters,
        });
      }, discResult.durationMs);
    }, 10000);
  });

  // GM手動で議論終了
  socket.on('end_discussion', ({ roomCode }) => {
    console.log(`[end_discussion] room=${roomCode}, requesterId=${socket.id}`);
    const result = gm.endDiscussion(roomCode, socket.id);
    if (result.error) {
      console.log(`[end_discussion] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const playerList = gm.getPlayerList(result.room);
    console.log(`[end_discussion] 投票フェーズへ: voters=${result.voters.length}人`);
    io.to(roomCode).emit('vote_started', {
      players: playerList,
      voters: result.voters,
    });
  });

  // プレイヤー投票
  socket.on('cast_vote', ({ roomCode, targetId }) => {
    console.log(`[cast_vote] room=${roomCode}, voter=${socket.id}, target=${targetId}`);
    const result = gm.castVote(roomCode, socket.id, targetId);
    if (result.error) {
      console.log(`[cast_vote] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      return;
    }
    console.log(`[cast_vote] 投票進捗: ${result.votedPlayerIds.length}/${result.room.votablePlayerIds.length}`);
    // 投票進捗を全員に通知
    io.to(roomCode).emit('vote_update', {
      votedPlayerIds: result.votedPlayerIds,
      votedCount: result.votedPlayerIds.length,
      totalVoters: result.room.votablePlayerIds.length,
    });
    // 全員投票完了 → 結果発表
    if (result.allVoted) {
      console.log(`[cast_vote] 全員投票完了 → 結果集計`);
      const tallyResult = gm.tallyVotes(roomCode);
      if (tallyResult) {
        io.to(roomCode).emit('result_revealed', tallyResult);
      }
    }
  });

  // ゲームリセット
  socket.on('restart_game', ({ roomCode }) => {
    console.log(`[restart_game] room=${roomCode}, requesterId=${socket.id}`);
    const result = gm.resetGame(roomCode, socket.id);
    if (result.error) {
      console.log(`[restart_game] エラー: ${result.error}`);
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    console.log(`[restart_game] リセット完了`);
    io.to(roomCode).emit('game_reset', {
      players: gm.getPlayerList(room),
      hostId: room.hostId,
    });
  });

  // ルーム退出
  socket.on('leave_room', () => {
    console.log(`[leave_room] socketId=${socket.id}`);
    const result = gm.leaveRoom(socket.id);
    if (!result) return;
    socket.leave(result.roomCode);
    if (!result.roomDeleted) {
      io.to(result.roomCode).emit('player_left', {
        players: gm.getPlayerList(result.room),
        hostId: result.room.hostId,
      });
    }
  });

  // 切断処理
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] id=${socket.id}, reason=${reason}`);
    const result = gm.handleDisconnect(socket.id);
    if (!result) return;

    const { roomCode, room } = result;
    console.log(`[disconnect] room=${roomCode}, 残りプレイヤー=${room.players.filter(p => p.isConnected).length}人`);
    io.to(roomCode).emit('player_updated', {
      players: gm.getPlayerList(room),
    });

    // 30秒後に復帰しなければ退出扱い
    const timer = setTimeout(() => {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isConnected) {
        console.log(`[disconnect] 30秒タイムアウト → 退出: ${socket.id}`);
        const leaveResult = gm.leaveRoom(socket.id);
        if (leaveResult && !leaveResult.roomDeleted) {
          io.to(roomCode).emit('player_left', {
            players: gm.getPlayerList(leaveResult.room),
            hostId: leaveResult.room.hostId,
          });
        }
      }
    }, 30000);

    // タイマーをルームに保存
    if (room.disconnectTimers) {
      room.disconnectTimers.set(socket.id, timer);
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});
