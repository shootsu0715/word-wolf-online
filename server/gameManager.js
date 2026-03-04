const { getRandomPair } = require('./topicPairs');

// ルーム管理クラス
class GameManager {
  constructor() {
    // roomCode → Room のマップ
    this.rooms = new Map();
    // socketId → roomCode のマップ（逆引き用）
    this.socketToRoom = new Map();
  }

  // 4桁英数字のルームコードを生成（重複チェック付き）
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  // ルーム作成
  createRoom(socketId, playerName) {
    const code = this.generateRoomCode();
    const room = {
      code,
      hostId: socketId,
      phase: 'LOBBY',
      players: [
        { id: socketId, name: playerName, isConnected: true }
      ],
      gameMasterId: null,
      settings: {
        wolfCount: 1,
        majorityTopic: '',
        wolfTopic: '',
        usePreset: true,
        discussionMinutes: 3,
      },
      assignments: [],
      disconnectTimers: new Map(),
      // 議論・投票・結果フェーズ用
      discussionEndTime: null,
      discussionTimer: null,
      votes: new Map(),
      votablePlayerIds: [],
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);
    return room;
  }

  // ルーム参加
  joinRoom(socketId, roomCode, playerName) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'ルームが見つかりません' };
    }
    if (room.phase !== 'LOBBY') {
      return { error: 'ゲームが既に始まっています' };
    }
    if (room.players.length >= 10) {
      return { error: 'ルームが満員です（最大10人）' };
    }
    // 同じ名前チェック
    if (room.players.some(p => p.name === playerName && p.isConnected)) {
      return { error: 'その名前は既に使われています' };
    }

    room.players.push({ id: socketId, name: playerName, isConnected: true });
    this.socketToRoom.set(socketId, roomCode);
    return { room };
  }

  // ルーム退出
  leaveRoom(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return null;
    }

    // プレイヤーを削除
    room.players = room.players.filter(p => p.id !== socketId);
    this.socketToRoom.delete(socketId);

    // ルームが空になったら削除
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      return { roomCode, roomDeleted: true };
    }

    // ホストが退出した場合、次のプレイヤーをホストに
    if (room.hostId === socketId) {
      const newHost = room.players.find(p => p.isConnected);
      if (newHost) {
        room.hostId = newHost.id;
      }
    }

    // GMが退出した場合（ゲーム中）
    if (room.gameMasterId === socketId) {
      // ホストにGM権限を移譲
      room.gameMasterId = room.hostId;
    }

    return { roomCode, room, roomDeleted: false };
  }

  // 切断処理（再接続可能な状態にする）
  handleDisconnect(socketId) {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === socketId);
    if (player) {
      player.isConnected = false;
    }

    return { roomCode, room, playerId: socketId };
  }

  // 再接続処理
  handleReconnect(oldSocketId, newSocketId, roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players.find(p => p.id === oldSocketId);
    if (!player) return null;

    // ソケットID更新
    player.id = newSocketId;
    player.isConnected = true;

    // 各種ID参照も更新
    if (room.hostId === oldSocketId) room.hostId = newSocketId;
    if (room.gameMasterId === oldSocketId) room.gameMasterId = newSocketId;

    // assignments内のIDも更新
    const assignment = room.assignments.find(a => a.playerId === oldSocketId);
    if (assignment) assignment.playerId = newSocketId;

    this.socketToRoom.delete(oldSocketId);
    this.socketToRoom.set(newSocketId, roomCode);

    return { room, player };
  }

  // ゲーム開始（GM選出）
  startGame(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ルームが見つかりません' };
    if (room.hostId !== requesterId) return { error: 'ホストのみ開始できます' };
    if (room.players.length < 3) return { error: '3人以上必要です' };

    // ランダムにGMを選出
    const connectedPlayers = room.players.filter(p => p.isConnected);
    const gmIndex = Math.floor(Math.random() * connectedPlayers.length);
    room.gameMasterId = connectedPlayers[gmIndex].id;
    room.phase = 'MASTER_REVEAL';

    return { room, gameMasterId: room.gameMasterId };
  }

  // GM発表完了 → お題設定フェーズへ
  proceedToTopicSet(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    room.phase = 'TOPIC_SET';
    return room;
  }

  // お題設定＆配布
  setTopics(roomCode, requesterId, { majorityTopic, wolfTopic, wolfCount, discussionMinutes }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ルームが見つかりません' };
    if (room.gameMasterId !== requesterId) return { error: 'ゲームマスターのみ設定できます' };

    // GM以外のプレイヤー
    const gamePlayers = room.players.filter(p => p.id !== room.gameMasterId && p.isConnected);
    const playerCount = gamePlayers.length;

    // バリデーション
    if (wolfCount < 1) return { error: 'ウルフは1人以上必要です' };
    if (wolfCount > playerCount - 2) return { error: `ウルフは最大${playerCount - 2}人までです（市民が最低2人必要）` };
    if (!majorityTopic || !wolfTopic) return { error: 'お題を入力してください' };
    if (majorityTopic === wolfTopic) return { error: '多数派と少数派のお題は異なる必要があります' };

    // 設定を保存
    const minutes = Math.max(1, Math.min(10, discussionMinutes || 3));
    room.settings = { wolfCount, majorityTopic, wolfTopic, discussionMinutes: minutes };

    // ランダムにウルフを割り当て
    const shuffled = [...gamePlayers].sort(() => Math.random() - 0.5);
    room.assignments = shuffled.map((player, index) => ({
      playerId: player.id,
      playerName: player.name,
      topic: index < wolfCount ? wolfTopic : majorityTopic,
      isWolf: index < wolfCount,
    }));

    room.phase = 'PLAY';
    return { room };
  }

  // ゲームリセット（LOBBYに戻る）
  resetGame(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ルームが見つかりません' };
    if (requesterId !== room.hostId && requesterId !== room.gameMasterId) {
      return { error: 'ホストまたはGMのみリセットできます' };
    }

    room.phase = 'LOBBY';
    room.gameMasterId = null;
    room.settings = { wolfCount: 1, majorityTopic: '', wolfTopic: '', usePreset: true, discussionMinutes: 3 };
    room.assignments = [];
    // 議論・投票関連のクリア
    if (room.discussionTimer) clearTimeout(room.discussionTimer);
    room.discussionEndTime = null;
    room.discussionTimer = null;
    room.votes = new Map();
    room.votablePlayerIds = [];

    return { room };
  }

  // 議論開始
  startDiscussion(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const durationMs = room.settings.discussionMinutes * 60 * 1000;
    room.phase = 'DISCUSS';
    room.discussionEndTime = Date.now() + durationMs;
    return { room, endTime: room.discussionEndTime, durationMs };
  }

  // 議論終了 → 投票フェーズへ
  endDiscussion(roomCode, requesterId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ルームが見つかりません' };
    // GMまたはタイマー満了（requesterId=nullは自動終了）
    if (requesterId && room.gameMasterId !== requesterId) {
      return { error: 'ゲームマスターのみ議論を終了できます' };
    }
    if (room.discussionTimer) {
      clearTimeout(room.discussionTimer);
      room.discussionTimer = null;
    }
    room.phase = 'VOTE';
    room.votes = new Map();
    // GM除外の投票可能プレイヤーID一覧
    room.votablePlayerIds = room.players
      .filter(p => p.id !== room.gameMasterId && p.isConnected)
      .map(p => p.id);
    const voters = room.votablePlayerIds.map(id => {
      const p = room.players.find(pl => pl.id === id);
      return { id, name: p ? p.name : '' };
    });
    return { room, voters };
  }

  // 投票
  castVote(roomCode, voterId, targetId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ルームが見つかりません' };
    if (room.phase !== 'VOTE') return { error: '投票フェーズではありません' };
    if (!room.votablePlayerIds.includes(voterId)) return { error: '投票権がありません' };
    if (!room.votablePlayerIds.includes(targetId)) return { error: '無効な投票先です' };
    if (voterId === targetId) return { error: '自分には投票できません' };
    if (room.votes.has(voterId)) return { error: '既に投票済みです' };

    room.votes.set(voterId, targetId);
    const votedPlayerIds = Array.from(room.votes.keys());
    const allVoted = votedPlayerIds.length === room.votablePlayerIds.length;
    return { room, votedPlayerIds, allVoted };
  }

  // 集計・勝敗判定
  tallyVotes(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    // 得票集計
    const tally = new Map();
    room.votablePlayerIds.forEach(id => tally.set(id, 0));
    room.votes.forEach((targetId) => {
      tally.set(targetId, (tally.get(targetId) || 0) + 1);
    });

    // 得票数順にソート
    const results = Array.from(tally.entries())
      .map(([playerId, voteCount]) => {
        const player = room.players.find(p => p.id === playerId);
        const assignment = room.assignments.find(a => a.playerId === playerId);
        return {
          playerId,
          playerName: player ? player.name : '',
          voteCount,
          isWolf: assignment ? assignment.isWolf : false,
          topic: assignment ? assignment.topic : '',
        };
      })
      .sort((a, b) => b.voteCount - a.voteCount);

    // 最多得票者を特定（同票チェック）
    const maxVotes = results[0].voteCount;
    const topVoted = results.filter(r => r.voteCount === maxVotes);
    const isTie = topVoted.length > 1;

    // ウルフが最多得票（単独）なら市民勝利、それ以外はウルフ勝利
    // 同票 = ウルフ勝利
    let wolfWins;
    if (isTie) {
      wolfWins = true;
    } else {
      wolfWins = !topVoted[0].isWolf;
    }

    // ウルフ一覧
    const wolves = room.assignments
      .filter(a => a.isWolf)
      .map(a => ({ playerName: a.playerName, playerId: a.playerId }));

    room.phase = 'RESULT';

    return {
      results,
      isTie,
      wolfWins,
      majorityTopic: room.settings.majorityTopic,
      wolfTopic: room.settings.wolfTopic,
      wolves,
    };
  }

  // ルーム情報取得
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  // プレイヤー名リスト取得（GM表示付き）
  getPlayerList(room) {
    return room.players
      .filter(p => p.isConnected)
      .map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.id === room.hostId,
        isGM: p.id === room.gameMasterId,
      }));
  }
}

module.exports = GameManager;
