import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Socket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || !data.roomId) return;
    
    // Security Guard: Prevent unauthorized clients from joining admin room
    if (data.roomId === 'admin') {
      const rawToken = client.handshake.headers?.authorization || client.handshake.auth?.token || data.token;
      if (!rawToken) {
        console.warn(`Unauthorized attempt to join admin room without token from client ${client.id}`);
        client.emit('error', { message: 'Unauthorized: Admin token required' });
        return;
      }

      const token = rawToken.replace(/^Bearer\s+/i, '');
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'your-secret-key',
        });
        if (!payload || (payload.role && payload.role !== 'ADMIN')) {
          console.warn(`Non-admin client ${client.id} attempted to join admin room`);
          client.emit('error', { message: 'Forbidden: Admin access required' });
          return;
        }
      } catch (err) {
        console.warn(`Invalid JWT token attempt to join admin room from client ${client.id}`);
        client.emit('error', { message: 'Unauthorized: Invalid or expired token' });
        return;
      }
    }

    client.join(data.roomId);
    console.log(`Client ${client.id} joined room: ${data.roomId}`);
  }


  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      zaloUserId: string;
      sender: string;
      content: string;
    },
  ) {
    // Save to Database
    const savedMsg = await this.chatService.saveMessage(
      data.zaloUserId,
      data.sender,
      data.content,
    );

    // Broadcast message to both user's room and admin room instantly
    this.server.to(data.zaloUserId).to('admin').emit('message', savedMsg);

    // Broadcast session update to all admin clients
    const updatedSessions = await this.chatService.getSessions();
    this.server.to('admin').emit('sessions_list', updatedSessions);
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { zaloUserId: string; sender: string },
  ) {
    await this.chatService.markAsRead(data.zaloUserId, data.sender);

    // Broadcast session update to update unread badge counts
    const updatedSessions = await this.chatService.getSessions();
    this.server.to('admin').emit('sessions_list', updatedSessions);
  }
}
