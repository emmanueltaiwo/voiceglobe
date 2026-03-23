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

export const getTrendingByReactions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const now = Date.now();

    const allReactions = await ctx.db.query('reactions').collect();
    const countByMessage = new Map<Id<'messages'>, number>();

    for (const r of allReactions) {
      countByMessage.set(
        r.messageId,
        (countByMessage.get(r.messageId) ?? 0) + 1,
      );
    }

    const sorted = [...countByMessage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 2);

    const results: { message: Doc<'messages'>; reactionCount: number }[] = [];
    for (const [messageId, count] of sorted) {
      if (results.length >= limit) break;
      const msg = await ctx.db.get(messageId);
      if (msg && msg.expiresAt > now && !msg.replyTo) {
        results.push({ message: msg, reactionCount: count });
      }
    }

    return results;
  },
});
