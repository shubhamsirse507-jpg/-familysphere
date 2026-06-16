import { Post, User, PostLike, PostComment } from '../models/index.js';

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.findAll({
      limit: 50,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'profilePhoto', 'role'] },
        { model: PostLike, attributes: ['id', 'userId'] },
        {
          model: PostComment,
          include: [{ model: User, as: 'commenter', attributes: ['id', 'name', 'profilePhoto', 'role'] }]
        }
      ]
    });
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const createPost = async (req, res) => {
  try {
    const { content, mediaUrl } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = await Post.create({
      content,
      mediaUrl: mediaUrl || null,
      userId: req.user.id
    });

    const fullPost = await Post.findByPk(post.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'profilePhoto', 'role'] },
        { model: PostLike, attributes: ['id', 'userId'] },
        {
          model: PostComment,
          include: [{ model: User, as: 'commenter', attributes: ['id', 'name', 'profilePhoto', 'role'] }]
        }
      ]
    });

    // Broadcast real-time feed update
    const io = req.app.get('io');
    if (io) {
      io.emit('feed_post_created', fullPost);
    }

    res.status(201).json(fullPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await post.destroy();

    // Broadcast deletion to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('feed_post_deleted', { id });
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

export const likePost = async (req, res) => {
  try {
    const { id } = req.params; // post id
    const userId = req.user.id;

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = await PostLike.findOne({
      where: { postId: id, userId }
    });

    if (existingLike) {
      await existingLike.destroy();
    } else {
      await PostLike.create({
        postId: id,
        userId
      });
    }

    const likes = await PostLike.findAll({
      where: { postId: id },
      attributes: ['id', 'userId']
    });

    // Broadcast likes update
    const io = req.app.get('io');
    if (io) {
      io.emit('feed_post_liked', { postId: id, likes });
    }

    res.json({ success: true, likes });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params; // post id
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await PostComment.create({
      content,
      postId: id,
      userId: req.user.id
    });

    const fullComment = await PostComment.findByPk(comment.id, {
      include: [
        { model: User, as: 'commenter', attributes: ['id', 'name', 'profilePhoto', 'role'] }
      ]
    });

    // Broadcast new comment
    const io = req.app.get('io');
    if (io) {
      io.emit('feed_post_commented', { postId: id, comment: fullComment });
    }

    res.status(201).json(fullComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};
