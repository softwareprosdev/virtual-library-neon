import { Server } from 'socket.io';

export interface NotificationPayload {
  userId: string;
  type: 'follow' | 'friend_request' | 'friend_request_accepted' | 'like' | 'comment' | 'mention' | 'message';
  title: string;
  message: string;
  data?: any;
  createdAt: Date;
}

export class NotificationService {
  constructor(private io: Server) {}

  // Send notification to specific user
  sendNotification(notification: NotificationPayload) {
    this.io.to(`user:${notification.userId}`).emit('notification', {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      read: false
    });
  }

  // Send follow notification
  sendFollowNotification(followerId: string, followerName: string, followingId: string) {
    this.sendNotification({
      userId: followingId,
      type: 'follow',
      title: 'New Follower',
      message: `${followerName} started following you`,
      data: { followerId, followerName },
      createdAt: new Date()
    });
  }

  // Send friend request notification
  sendFriendRequestNotification(senderId: string, senderName: string, receiverId: string, message?: string) {
    this.sendNotification({
      userId: receiverId,
      type: 'friend_request',
      title: 'Friend Request',
      message: `${senderName} sent you a friend request${message ? `: "${message}"` : ''}`,
      data: { senderId, senderName, message },
      createdAt: new Date()
    });
  }

  // Send friend request accepted notification
  sendFriendRequestAcceptedNotification(receiverId: string, receiverName: string, senderId: string) {
    this.sendNotification({
      userId: senderId,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      message: `${receiverName} accepted your friend request`,
      data: { receiverId, receiverName },
      createdAt: new Date()
    });
  }

  // Send like notification
  sendLikeNotification(likedById: string, likedByName: string, postId: string, postTitle: string, postAuthorId: string) {
    this.sendNotification({
      userId: postAuthorId,
      type: 'like',
      title: 'Post Liked',
      message: `${likedByName} liked your post "${postTitle}"`,
      data: { likedById, likedByName, postId, postTitle },
      createdAt: new Date()
    });
  }

  // Send comment notification
  sendCommentNotification(commenterId: string, commenterName: string, profileId: string, profileName: string, commentContent: string) {
    this.sendNotification({
      userId: profileId,
      type: 'comment',
      title: 'New Profile Comment',
      message: `${commenterName} commented on your profile: "${commentContent.substring(0, 50)}${commentContent.length > 50 ? '...' : ''}"`,
      data: { commenterId, commenterName, profileId, profileName, commentContent },
      createdAt: new Date()
    });
  }

  // Send mention notification
  sendMentionNotification(mentionerId: string, mentionerName: string, mentionedUserId: string, content: string, type: 'comment' | 'post' = 'comment') {
    this.sendNotification({
      userId: mentionedUserId,
      type: 'mention',
      title: `Mentioned in ${type}`,
      message: `${mentionerName} mentioned you: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      data: { mentionerId, mentionerName, content, type },
      createdAt: new Date()
    });
  }

  // Send direct message notification
  sendDirectMessageNotification(senderId: string, senderName: string, receiverId: string, messageContent: string) {
    this.sendNotification({
      userId: receiverId,
      type: 'message',
      title: 'New Message',
      message: `${senderName}: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}"`,
      data: { senderId, senderName, messageContent },
      createdAt: new Date()
    });
  }
}

// Singleton instance for the app
let notificationService: NotificationService | null = null;

export const initializeNotifications = (io: Server) => {
  if (!notificationService) {
    notificationService = new NotificationService(io);
  }
  return notificationService;
};

export const getNotificationService = () => {
  if (!notificationService) {
    throw new Error('Notification service not initialized. Call initializeNotifications first.');
  }
  return notificationService;
};