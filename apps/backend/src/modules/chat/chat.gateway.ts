import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';

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
  ) {}

  publishMessage(message: any) {
    if (!this.server || !message?.zaloUserId) return;
    this.server.to(message.zaloUserId).to('admin').emit('message', message);
  }

  async publishSessions() {
    if (!this.server) return;
    const sessions = await this.chatService.getSessions();
    this.server.to('admin').emit('sessions_list', sessions);
  }

  handleConnection(client: Socket) {
    console.log(`Socket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  @UseGuards(WsJwtAuthGuard)
  handleJoinRoom(
    @MessageBody() data: { roomId: string; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data || !data.roomId) return;
    
    const user = client.data.user;
    if (!user) return;

    // A user may only join their own room; admins may join the support room.
    if (data.roomId === 'admin') {
      if (user.role !== 'admin') {
        client.emit('error', { message: 'Forbidden: Admin access required' });
        return;
      }
    } else if (data.roomId !== user.zaloId && user.role !== 'admin') {
      client.emit('error', { message: 'Forbidden: Invalid chat room' });
      return;
    }

    client.join(data.roomId);
    console.log(`Client ${client.id} joined room: ${data.roomId}`);
  }


  @SubscribeMessage('send_message')
  @UseGuards(WsJwtAuthGuard)
  async handleMessage(
    @MessageBody()
    data: {
      zaloUserId: string;
      sender: string;
      content: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client?.data?.user;
    if (!user || (user.role !== 'admin' && data.zaloUserId !== user.zaloId)) {
      client?.emit('error', { message: 'Forbidden: Invalid chat recipient' });
      return;
    }
    const sender = user.role === 'admin' ? 'ADMIN' : 'USER';

    // Save to Database using the authenticated role, never the client-provided sender.
    const savedMsg = await this.chatService.saveMessage(
      data.zaloUserId,
      sender,
      data.content,
    );

    this.publishMessage(savedMsg);
    await this.publishSessions();
  }

  @SubscribeMessage('mark_read')
  @UseGuards(WsJwtAuthGuard)
  async handleMarkRead(
    @MessageBody() data: { zaloUserId: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    if (!user || (user.role !== 'admin' && data.zaloUserId !== user.zaloId)) return;
    await this.chatService.markAsRead(data.zaloUserId, user.role === 'admin' ? 'USER' : 'ADMIN');

    // Broadcast session update to update unread badge counts
    await this.publishSessions();
  }
}
