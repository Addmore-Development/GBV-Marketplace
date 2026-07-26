// ============================================================
// frontend/src/app/services/realtime.service.ts
// Thin wrapper around socket.io-client, shared by the admin dashboard,
// centre dashboard, and the public Centres page. One socket connection per
// browser tab; components join whichever rooms are relevant to them and
// subscribe to the events they care about.
// ============================================================
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;

  private get connection(): Socket {
    if (!this.socket) {
      this.socket = io(environment.apiUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });
    }
    return this.socket;
  }

  /** Join a room — e.g. 'admin', `centre:${centreId}`, or 'public-feed'. */
  join(room: string): void {
    if (!room) return;
    this.connection.emit('join', room);
  }

  leave(room: string): void {
    if (!room || !this.socket) return;
    this.socket.emit('leave', room);
  }

  /** Subscribe to a server-pushed event, e.g. 'emergency:new', 'need:new'. */
  on<T = any>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (payload: T) => subscriber.next(payload);
      this.connection.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
