import { Server } from 'socket.io';

let io: Server | null = null;

export function initWebSocket(server: any) {
  io = new Server(server, { path: '/api/socket' });
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.join('canvas-default');
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  return io;
}

export function broadcastPixelUpdate(pixel: any) {
  if (io) {
    io.to('canvas-default').emit('pixel-update', pixel);
  }
}

export function getIO() {
  return io;
}
