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
  console.log(`接続: ${socket.id}`);

  // ルーム作成
  socket.on('create_room', ({ playerName }, callback) => {
    const room = gm.createRoom(socket.id, playerName);
    socket.join(room.code);
    const response = {
      roomCode: room.code,
      players: gm.getPlayerList(room),
      hostId: room.hostId,
      myId: socket.id,
    };
    if (callback) callback(response);
    socket.emit('room_created', response);
  });

  // ルーム参加
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    const result = gm.joinRoom(socket.id, roomCode.toUpperCase(), playerName);
    if (result.error) {
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
    if (callback) callback(response);
    socket.emit('room_joined', response);
    // 他のプレイヤーに通知
    socket.to(room.code).emit('player_joined', { players });
  });

  // ゲーム開始
  socket.on('start_game', ({ roomCode }) => {
    const result = gm.startGame(roomCode, socket.id);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    const gmPlayer = room.players.find(p => p.id === room.gameMasterId);
    // 全員にGM発表
    io.to(roomCode).emit('game_started', {
      gameMasterId: room.gameMasterId,
      gameMasterName: gmPlayer ? gmPlayer.name : '',
      players: gm.getPlayerList(room),
    });

    // 3秒後にお題設定フェーズへ遷移（演出時間）
    setTimeout(() => {
      gm.proceedToTopicSet(roomCode);
      // GMにはお題設定画面、他は待機画面
      io.to(room.gameMasterId).emit('show_topic_setup', {
        playerCount: room.players.filter(p => p.id !== room.gameMasterId && p.isConnected).length,
        presetPair: getRandomPair(),
      });
      // GM以外に待機指示
      room.players
        .filter(p => p.id !== room.gameMasterId && p.isConnected)
        .forEach(p => {
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
    const result = gm.setTopics(roomCode, socket.id, { majorityTopic, wolfTopic, wolfCount, discussionMinutes });
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    const playerList = gm.getPlayerList(room);
    const gamePlayers = room.players.filter(p => p.id !== room.gameMasterId && p.isConnected);

    // 各プレイヤーに個別にお題を送信（重要：broadcastしない）
    room.assignments.forEach(a => {
      io.to(a.playerId).emit('topics_assigned', {
        myTopic: a.topic,
        isWolf: a.isWolf,
        wolfCount: room.settings.wolfCount,
        totalPlayers: gamePlayers.length,
        players: playerList,
      });
    });

    // GMには全体情報を送信（進行用）
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
      if (!currentRoom || currentRoom.phase !== 'PLAY') return;
      const discResult = gm.startDiscussion(roomCode);
      if (!discResult) return;
      io.to(roomCode).emit('discussion_started', {
        endTime: discResult.endTime,
        durationMs: discResult.durationMs,
      });
      // タイマー満了で自動的に投票フェーズへ
      currentRoom.discussionTimer = setTimeout(() => {
        const r = gm.getRoom(roomCode);
        if (!r || r.phase !== 'DISCUSS') return;
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
    const result = gm.endDiscussion(roomCode, socket.id);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const playerList = gm.getPlayerList(result.room);
    io.to(roomCode).emit('vote_started', {
      players: playerList,
      voters: result.voters,
    });
  });

  // プレイヤー投票
  socket.on('cast_vote', ({ roomCode, targetId }) => {
    const result = gm.castVote(roomCode, socket.id, targetId);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }
    // 投票進捗を全員に通知
    io.to(roomCode).emit('vote_update', {
      votedPlayerIds: result.votedPlayerIds,
      votedCount: result.votedPlayerIds.length,
      totalVoters: result.room.votablePlayerIds.length,
    });
    // 全員投票完了 → 結果発表
    if (result.allVoted) {
      const tallyResult = gm.tallyVotes(roomCode);
      if (tallyResult) {
        io.to(roomCode).emit('result_revealed', tallyResult);
      }
    }
  });

  // ゲームリセット
  socket.on('restart_game', ({ roomCode }) => {
    const result = gm.resetGame(roomCode, socket.id);
    if (result.error) {
      socket.emit('error_msg', { message: result.error });
      return;
    }
    const room = result.room;
    io.to(roomCode).emit('game_reset', {
      players: gm.getPlayerList(room),
      hostId: room.hostId,
    });
  });

  // ルーム退出
  socket.on('leave_room', () => {
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
  socket.on('disconnect', () => {
    console.log(`切断: ${socket.id}`);
    const result = gm.handleDisconnect(socket.id);
    if (!result) return;

    const { roomCode, room } = result;
    io.to(roomCode).emit('player_updated', {
      players: gm.getPlayerList(room),
    });

    // 30秒後に復帰しなければ退出扱い
    const timer = setTimeout(() => {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isConnected) {
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
