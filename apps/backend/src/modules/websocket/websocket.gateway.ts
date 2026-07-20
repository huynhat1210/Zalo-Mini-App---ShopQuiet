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
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrderTrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderTrackingGateway.name);

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrder')
  async handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order_${orderId}`);
    this.logger.log(`Client ${client.id} joined order ${orderId}`);

    // Send current order status
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (order) {
      client.emit('orderStatus', {
        orderId: order.id,
        status: order.status,
        estimatedDeliveryDate: order.estimatedDeliveryDate,
        shippingMethodCode: order.shippingMethodCode,
      });
    }
  }

  @SubscribeMessage('leaveOrder')
  handleLeaveOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order_${orderId}`);
    this.logger.log(`Client ${client.id} left order ${orderId}`);
  }

  // Method to broadcast order status update to all clients listening to this order
  async broadcastOrderStatus(orderId: string, status: string) {
    this.server.to(`order_${orderId}`).emit('orderStatus', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast estimated delivery date update
  async broadcastDeliveryDateUpdate(orderId: string, estimatedDeliveryDate: Date) {
    this.server.to(`order_${orderId}`).emit('deliveryDateUpdate', {
      orderId,
      estimatedDeliveryDate,
      timestamp: new Date().toISOString(),
    });
  }
}
