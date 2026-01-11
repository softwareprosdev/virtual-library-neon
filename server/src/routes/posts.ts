import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Create a new post
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { content, mediaUrls = [], mediaTypes = [], visibility = 'PUBLIC' } = req.body;

    if (!content?.trim() && mediaUrls.length === 0) {
      res.status(400).json({ message: 'Post must have content or media' });
      return;
    }

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [...(content?.matchAll(hashtagRegex) || [])].map((match: RegExpMatchArray) => match[1].toLowerCase());

    // Extract mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = [...(content?.matchAll(mentionRegex) || [])].map((match: RegExpMatchArray) => match[1]);

    // Find mentioned users
    const mentionedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { in: mentionedNames, mode: 'insensitive' } },
          { displayName: { in: mentionedNames, mode: 'insensitive' } }
        ]
      },
      select: { id: true, name: true }
    });

    const mentions = mentionedUsers.map(u => u.id);

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        content: content || '',
        mediaUrls,
        mediaTypes,
        hashtags,
        mentions,
        visibility: visibility as 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      }
    });

    // Update hashtag counts
    for (const tag of hashtags) {
      await prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag, postCount: 1 },
        update: { postCount: { increment: 1 } }
      });
    }

    // Create notifications for mentioned users
    for (const userId of mentions) {
      if (userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId,
            actorId: req.user.id,
            type: 'MENTION',
            title: 'You were mentioned',
            body: 'mentioned you in a post',
            data: { postId: post.id }
          }
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'CREATE_POST',
        details: JSON.stringify({ postId: post.id })
      }
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// Get feed (posts from followed users)
router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    // Get list of users the current user follows
    const following = await prisma.follows.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user.id); // Include own posts

    // Get blocked users
    const blockedUsers = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: req.user.id },
          { blockedId: req.user.id }
        ]
      }
    });
    const blockedIds = blockedUsers.map(b =>
      b.blockerId === req.user!.id ? b.blockedId : b.blockerId
    );

    const posts = await prisma.post.findMany({
      where: {
        userId: { in: followingIds, notIn: blockedIds },
        OR: [
          { visibility: 'PUBLIC' },
          { visibility: 'FOLLOWERS_ONLY', userId: { in: followingIds } },
          { userId: req.user.id } // Own posts always visible
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = posts.length > take;
    const feedPosts = hasMore ? posts.slice(0, -1) : posts;

    const result = feedPosts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares
    }));

    res.json({
      posts: result,
      nextCursor: hasMore ? feedPosts[feedPosts.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Failed to get feed' });
  }
});

// Get explore feed (trending/popular posts)
router.get('/explore', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    // Get blocked users
    const blockedUsers = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: req.user.id },
          { blockedId: req.user.id }
        ]
      }
    });
    const blockedIds = blockedUsers.map(b =>
      b.blockerId === req.user!.id ? b.blockedId : b.blockerId
    );

    const posts = await prisma.post.findMany({
      where: {
        visibility: 'PUBLIC',
        userId: { notIn: blockedIds }
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' }
      ],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = posts.length > take;
    const explorePosts = hasMore ? posts.slice(0, -1) : posts;

    const result = explorePosts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares
    }));

    res.json({
      posts: result,
      nextCursor: hasMore ? explorePosts[explorePosts.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get explore error:', error);
    res.status(500).json({ message: 'Failed to get explore feed' });
  }
});

// Get a single post
router.get('/:postId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        comments: {
          where: { parentId: null },
          include: {
            user: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            },
            replies: {
              include: {
                user: {
                  select: { id: true, name: true, displayName: true, avatarUrl: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Failed to get post' });
  }
});

// Get user's posts
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    // Check if viewing own posts or if user follows
    const isOwnProfile = userId === req.user.id;
    const isFollowing = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: userId
        }
      }
    });

    const visibilityFilter = isOwnProfile
      ? {} // See all own posts
      : isFollowing
        ? { visibility: { in: ['PUBLIC', 'FOLLOWERS_ONLY'] as const } }
        : { visibility: 'PUBLIC' as const };

    const posts = await prisma.post.findMany({
      where: {
        userId,
        ...visibilityFilter
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = posts.length > take;
    const userPosts = hasMore ? posts.slice(0, -1) : posts;

    const result = userPosts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares
    }));

    res.json({
      posts: result,
      nextCursor: hasMore ? userPosts[userPosts.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Failed to get posts' });
  }
});

// Like a post
router.post('/:postId/like', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: req.user.id
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: { id: existingLike.id }
      });
      res.json({ liked: false });
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          postId,
          userId: req.user.id
        }
      });

      // Create notification
      if (post.userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: post.userId,
            actorId: req.user.id,
            type: 'LIKE',
            title: 'New Like',
            body: 'liked your post',
            data: { postId }
          }
        });
      }

      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Comment on a post
router.post('/:postId/comment', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ message: 'Comment content is required' });
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: req.user.id,
        content,
        parentId
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Create notification
    if (post.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.userId,
          actorId: req.user.id,
          type: 'COMMENT',
          title: 'New Comment',
          body: 'commented on your post',
          data: { postId, commentId: comment.id }
        }
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment on post error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Share a post
router.post('/:postId/share', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { comment } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const share = await prisma.postShare.create({
      data: {
        postId,
        userId: req.user.id,
        comment
      }
    });

    // Create notification
    if (post.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.userId,
          actorId: req.user.id,
          type: 'SHARE',
          title: 'Post Shared',
          body: 'shared your post',
          data: { postId }
        }
      });
    }

    res.status(201).json(share);
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Failed to share post' });
  }
});

// Bookmark a post
router.post('/:postId/bookmark', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    const existingBookmark = await prisma.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: req.user.id
        }
      }
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.postBookmark.delete({
        where: { id: existingBookmark.id }
      });
      res.json({ bookmarked: false });
    } else {
      // Add bookmark
      await prisma.postBookmark.create({
        data: {
          postId,
          userId: req.user.id
        }
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({ message: 'Failed to bookmark post' });
  }
});

// Get user's bookmarked posts
router.get('/bookmarks/list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    const bookmarks = await prisma.postBookmark.findMany({
      where: { userId: req.user.id },
      include: {
        post: {
          include: {
            user: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            },
            likes: {
              where: { userId: req.user.id },
              select: { id: true }
            },
            _count: {
              select: { likes: true, comments: true, shares: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = bookmarks.length > take;
    const bookmarkedPosts = hasMore ? bookmarks.slice(0, -1) : bookmarks;

    const result = bookmarkedPosts.map(b => ({
      ...b.post,
      isLiked: b.post.likes.length > 0,
      isBookmarked: true,
      likeCount: b.post._count.likes,
      commentCount: b.post._count.comments,
      shareCount: b.post._count.shares,
      bookmarkedAt: b.createdAt
    }));

    res.json({
      posts: result,
      nextCursor: hasMore ? bookmarkedPosts[bookmarkedPosts.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ message: 'Failed to get bookmarks' });
  }
});

// Update a post
router.put('/:postId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { content, visibility } = req.body;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to edit this post' });
      return;
    }

    // Re-extract hashtags
    const hashtagRegex = /#(\w+)/g;
    const hashtags = content
      ? [...content.matchAll(hashtagRegex)].map((match: RegExpMatchArray) => match[1].toLowerCase())
      : post.hashtags;

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content || post.content,
        visibility: visibility || post.visibility,
        hashtags,
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      }
    });

    res.json(updatedPost);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:postId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to delete this post' });
      return;
    }

    // Decrement hashtag counts
    for (const tag of post.hashtags) {
      await prisma.hashtag.updateMany({
        where: { name: tag, postCount: { gt: 0 } },
        data: { postCount: { decrement: 1 } }
      });
    }

    await prisma.post.delete({
      where: { id: postId }
    });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

// Get trending hashtags
router.get('/hashtags/trending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hashtags = await prisma.hashtag.findMany({
      where: { postCount: { gt: 0 } },
      orderBy: { postCount: 'desc' },
      take: 10
    });

    res.json(hashtags);
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({ message: 'Failed to get trending hashtags' });
  }
});

// Search posts by hashtag
router.get('/hashtag/:tag', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { tag } = req.params;
    const tagString = Array.isArray(tag) ? tag[0] : tag;
    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    const posts = await prisma.post.findMany({
      where: {
        hashtags: { has: tagString.toLowerCase() },
        visibility: 'PUBLIC'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = posts.length > take;
    const hashtagPosts = hasMore ? posts.slice(0, -1) : posts;

    const result = hashtagPosts.map(post => ({
      ...post,
      isLiked: post.likes.length > 0,
      isBookmarked: post.bookmarks.length > 0,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      shareCount: post._count.shares
    }));

    res.json({
      posts: result,
      nextCursor: hasMore ? hashtagPosts[hashtagPosts.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Search by hashtag error:', error);
    res.status(500).json({ message: 'Failed to search posts' });
  }
});

export default router;
