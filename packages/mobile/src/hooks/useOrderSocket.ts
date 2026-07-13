import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../lib/constants';

interface OrderStatusUpdate {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
}

export function useOrderSocket(
  orderId: string | undefined,
  onStatusUpdate: (data: OrderStatusUpdate) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onStatusUpdate);
  callbackRef.current = onStatusUpdate;

  useEffect(() => {
    if (!orderId) return;

    const socket = io(API_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.emit('join:order', orderId);

    socket.on('order:statusUpdate', (data: OrderStatusUpdate) => {
      if (data.id === orderId) {
        callbackRef.current(data);
      }
    });

    return () => {
      socket.emit('leave:order', orderId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  return { disconnect };
}
