// ============================================================
// backend/src/socket.ts
// Real-time layer shared by the whole app. index.ts calls initSocket()
// once with the raw http.Server; every controller imports getIO() to
// broadcast events (emergency alerts, new needs, new buyer/seller signups)
// without creating a circular import back to index.ts.
// ============================================================
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Clients join whichever rooms are relevant to what they're viewing.
    // 'admin'         -> admin dashboard (every alert / signup)
    // 'centre:<id>'   -> that centre's dashboard (alerts for their sellers)
    // 'public-feed'    -> the public centres page (live needs board)
    socket.on('join', (room: string) => {
      if (typeof room === 'string' && room.length < 100) socket.join(room);
    });
    socket.on('leave', (room: string) => {
      if (typeof room === 'string') socket.leave(room);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}
