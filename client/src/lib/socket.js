// Singleton socket instance shared across the app.
// This lives outside Redux since socket.io instances are not serializable.
import { io } from 'socket.io-client';

export const socket = io(
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  {
    autoConnect: false,
    withCredentials: true,
  }
);
