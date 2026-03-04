import { io } from 'socket.io-client';

// 本番：同一オリジン配信のためURL指定不要（自動で同一ホストに接続）
// 開発：Viteプロキシ経由のためURL指定不要
const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export default socket;
