import { io } from 'socket.io-client';

// 本番時はデプロイ先URL、開発時はViteプロキシ経由（URL指定なし）
const PRODUCTION_URL = 'https://word-wolf-online.onrender.com';
const SERVER_URL = import.meta.env.PROD ? PRODUCTION_URL : undefined;

const socket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
