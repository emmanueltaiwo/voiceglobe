import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';

const EMOJIS = [
  'heart',
  'laugh',
  'cry',
  'fire',
  'clap',
  'mindblown',
  'party',
  'wow',
] as const;
type Emoji = (typeof EMOJIS)[number];

export const getReactions = query({
  args: {
    messageId: v.id('messages'),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query('reactions')
      .withIndex('by_message', (q) => q.eq('messageId', args.messageId))
      .collect();

    const counts = Object.fromEntries(EMOJIS.map((e) => [e, 0])) as Record<
      Emoji,
      number
    >;
    let myReaction: Emoji | null = null;

    for (const r of reactions) {
      if (EMOJIS.includes(r.emoji as Emoji)) {
        counts[r.emoji as Emoji]++;
      }
      if (r.clientId === args.clientId) {
        myReaction = r.emoji as Emoji;
      }
    }

    return { ...counts, myReaction };
  },
});

export const setReaction = mutation({
  args: {
    messageId: v.id('messages'),
    emoji: v.union(
      v.literal('heart'),
      v.literal('laugh'),
      v.literal('cry'),
      v.literal('fire'),
      v.literal('clap'),
      v.literal('mindblown'),
      v.literal('party'),
      v.literal('wow'),
    ),
    clientId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.expiresAt <= Date.now()) {
      throw new Error('Message not found or expired');
    }

    const existing = await ctx.db
      .query('reactions')
      .withIndex('by_message_client', (q) =>
        q.eq('messageId', args.messageId).eq('clientId', args.clientId),
      )
      .first();

    if (existing) {
      if (existing.emoji === args.emoji) {
        await ctx.db.delete(existing._id);
        return { removed: true };
      }
      await ctx.db.patch(existing._id, { emoji: args.emoji });
    } else {
      await ctx.db.insert('reactions', {
        messageId: args.messageId,
        emoji: args.emoji,
        clientId: args.clientId,
      });
    }
    return { removed: false };
  },
});

const EMOJI_LABELS: Record<string, string> = {
  heart: '❤️',
  laugh: '😂',
  cry: '😢',
  fire: '🔥',
  clap: '👏',
  mindblown: '🤯',
  party: '🎉',
  wow: '😮',
};

export const getTrendingByReactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const now = Date.now();

    const allReactions = await ctx.db.query('reactions').collect();
    const totalByMessage = new Map<Id<'messages'>, number>();
    const byMessageAndEmoji = new Map<
      Id<'messages'>,
      Partial<Record<Emoji, number>>
    >();

    for (const r of allReactions) {
      totalByMessage.set(
        r.messageId,
        (totalByMessage.get(r.messageId) ?? 0) + 1,
      );
      const emojiMap = byMessageAndEmoji.get(r.messageId) ?? {};
      emojiMap[r.emoji as Emoji] = (emojiMap[r.emoji as Emoji] ?? 0) + 1;
      byMessageAndEmoji.set(r.messageId, emojiMap);
    }

    const sorted = [...totalByMessage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 2);

    const results: {
      message: Doc<'messages'>;
      reactionCount: number;
      topEmoji: string;
    }[] = [];
    for (const [messageId, count] of sorted) {
      if (results.length >= limit) break;
      const msg = await ctx.db.get(messageId);
      if (msg && msg.expiresAt > now && !msg.replyTo) {
        const emojiMap = byMessageAndEmoji.get(messageId) ?? {};
        const topKey = (EMOJIS.reduce((a, b) =>
          (emojiMap[a] ?? 0) >= (emojiMap[b] ?? 0) ? a : b,
        ) ?? 'heart') as Emoji;
        results.push({
          message: msg,
          reactionCount: count,
          topEmoji: EMOJI_LABELS[topKey] ?? '❤️',
        });
      }
    }

    return results;
  },
});
