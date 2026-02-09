'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Pixel } from '@/types';

export function useCanvasSocket(onPixelUpdate: (pixel: Pixel) => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onPixelUpdate);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onPixelUpdate;
  }, [onPixelUpdate]);
  
  useEffect(() => {
    const socket = io({ path: '/api/socket' });
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[PixelMolt] WebSocket connected');
      setConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('[PixelMolt] WebSocket disconnected');
      setConnected(false);
    });
    
    socket.on('pixel-update', (pixel: Pixel) => {
      console.log('[PixelMolt] Received pixel update:', pixel);
      callbackRef.current(pixel);
    });
    
    socket.on('connect_error', (err) => {
      console.log('[PixelMolt] WebSocket connection error:', err.message);
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);
  
  return { connected };
}
