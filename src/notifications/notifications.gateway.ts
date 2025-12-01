// notifications.gateway.ts
import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true
  },
  namespace: 'notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Nettoyer les références de socket
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        } else {
          this.userSockets.set(userId, socketIds);
        }
        break;
      }
    }
  }

  @SubscribeMessage('join_user_room')
  handleJoinUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = data;
    
    // Ajouter le socket à la liste des sockets de l'utilisateur
    const userSocketIds = this.userSockets.get(userId) || [];
    if (!userSocketIds.includes(client.id)) {
      userSocketIds.push(client.id);
      this.userSockets.set(userId, userSocketIds);
    }

    // Joindre la room spécifique à l'utilisateur
    client.join(`user-${userId}`);
    
    this.logger.log(`User ${userId} joined notification room with socket ${client.id}`);
    
    return { status: 'joined', room: `user-${userId}` };
  }

  @SubscribeMessage('leave_user_room')
  handleLeaveUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket
  ) {
    const { userId } = data;
    
    // Retirer le socket de la liste
    const userSocketIds = this.userSockets.get(userId) || [];
    const index = userSocketIds.indexOf(client.id);
    if (index > -1) {
      userSocketIds.splice(index, 1);
      if (userSocketIds.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, userSocketIds);
      }
    }

    // Quitter la room
    client.leave(`user-${userId}`);
    
    this.logger.log(`User ${userId} left notification room`);
    
    return { status: 'left', room: `user-${userId}` };
  }

  

  // Méthode pour envoyer une notification à un utilisateur spécifique
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user-${userId}`).emit('new_notification', {
      ...notification,
      timestamp: new Date()
    });
    
    this.logger.log(`Notification sent to user ${userId}: ${notification.title}`);
  }

  // Méthode pour envoyer une notification à plusieurs utilisateurs
  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  // Envoyer une notification générale (broadcast)
  sendBroadcastNotification(notification: any) {
    this.server.emit('broadcast_notification', {
      ...notification,
      timestamp: new Date()
    });
    
    this.logger.log(`Broadcast notification sent: ${notification.title}`);
  }

  // Obtenir les utilisateurs connectés
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // Vérifier si un utilisateur est connecté
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.length > 0;
  }

  // Obtenir le nombre de connexions d'un utilisateur
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.length || 0;
  }
}