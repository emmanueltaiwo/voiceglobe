import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { iso1A2Code } from 'country-coder';
import { flag, name } from 'country-emoji';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORDING_SEC = 10;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createMessage = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    audioStorageId: v.id('_storage'),
    duration: v.number(),
    replyTo: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    if (args.duration > MAX_RECORDING_SEC) {
      throw new Error(`Recording exceeds maximum duration of ${MAX_RECORDING_SEC} seconds`);
    }
    const audioUrl = await ctx.storage.getUrl(args.audioStorageId);
    if (!audioUrl) throw new Error('Invalid audio file');

    const now = Date.now();
    const countryCode = iso1A2Code([args.lng, args.lat]) ?? undefined;

    let isFirstInCountry = false;

    if (countryCode) {
      const existingInCountry = await ctx.db
        .query('messages')
        .withIndex('by_country', (q) => q.eq('countryCode', countryCode))
        .filter((q) => q.gt(q.field('expiresAt'), now))
        .first();
      isFirstInCountry = !existingInCountry;
    }

    await ctx.db.insert('messages', {
      lat: args.lat,
      lng: args.lng,
      audioUrl,
      duration: args.duration,
      createdAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
      replyTo: args.replyTo,
      countryCode,
      isFirstInCountry: countryCode ? isFirstInCountry : undefined,
    });
  },
});

export const getMessagesInBounds = query({
  args: {
    minLat: v.number(),
    maxLat: v.number(),
    minLng: v.number(),
    maxLng: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_location', (q) =>
        q.gte('lat', args.minLat).lte('lat', args.maxLat),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field('lng'), args.minLng),
          q.lte(q.field('lng'), args.maxLng),
          q.gt(q.field('expiresAt'), now),
        ),
      )
      .collect();

    return messages;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const messages = await ctx.db
      .query('messages')
      .filter((q) => q.gt(q.field('expiresAt'), now))
      .collect();

    const total = messages.length;
    let totalDuration = 0;
    const byCountry = new Map<string, number>();

    for (const msg of messages) {
      totalDuration += msg.duration;
      const code = iso1A2Code([msg.lng, msg.lat]);
      if (code) {
        byCountry.set(code, (byCountry.get(code) ?? 0) + 1);
      }
    }

    const topCountries: {
      code: string;
      name: string;
      flag: string;
      count: number;
    }[] = [];
    const sorted = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const [code, count] = sorted[i];
      const flagEmoji = flag(code);
      const countryName = name(code) ?? code;
      if (flagEmoji) {
        topCountries.push({ code, name: countryName, flag: flagEmoji, count });
      }
    }

    return {
      total,
      totalDurationMinutes: Math.round((totalDuration / 60) * 10) / 10,
      topCountries,
    };
  },
});

export const getRandomMessage = query({
  args: { seed: v.optional(v.number()) },
  handler: async (ctx) => {
    const now = Date.now();
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_location', (q) => q.gte('lat', -90).lte('lat', 90))
      .filter((q) => q.gt(q.field('expiresAt'), now))
      .take(300);
    if (messages.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex] ?? null;
  },
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const getTrendingToday = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - ONE_DAY_MS;
    const recentMessages = await ctx.db
      .query('messages')
      .withIndex('by_createdAt', (q) => q.gte('createdAt', cutoff))
      .collect();

    const replyCountByParent = new Map<
      import('./_generated/dataModel').Id<'messages'>,
      number
    >();

    for (const msg of recentMessages) {
      if (msg.replyTo) {
        replyCountByParent.set(
          msg.replyTo,
          (replyCountByParent.get(msg.replyTo) ?? 0) + 1,
        );
      }
    }

    if (replyCountByParent.size === 0) return null;

    let topParentId: import('./_generated/dataModel').Id<'messages'> | null =
      null;
    let maxCount = 0;
    for (const [id, count] of replyCountByParent) {
      if (count > maxCount) {
        maxCount = count;
        topParentId = id;
      }
    }

    if (!topParentId) return null;
    const parent = await ctx.db.get(topParentId);
    if (!parent || parent.expiresAt <= now) return null;

    const replies = await ctx.db
      .query('messages')
      .withIndex('by_reply', (q) => q.eq('replyTo', topParentId))
      .filter((q) => q.gte(q.field('createdAt'), cutoff))
      .collect();

    return { message: parent, replyCount: replies.length };
  },
});

const RECENT_ACTIVITY_LIMIT = 100;

export const getRecentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? RECENT_ACTIVITY_LIMIT;
    const now = Date.now();

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_createdAt', (q) => q.gte('createdAt', 0))
      .order('desc')
      .filter((q) => q.gt(q.field('expiresAt'), now))
      .take(limit);

    return messages.map((m) => ({
      ...m,
      countryName: m.countryCode
        ? (name(m.countryCode) ?? m.countryCode)
        : null,
      countryFlag: m.countryCode ? flag(m.countryCode) : null,
    }));
  },
});

export const getReplies = query({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('messages')
      .withIndex('by_reply', (q) => q.eq('replyTo', args.messageId))
      .filter((q) => q.gt(q.field('expiresAt'), Date.now()))
      .collect();
  },
});

export const deleteExpiredMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('messages')
      .withIndex('by_expiry', (q) => q.lt('expiresAt', now))
      .collect();
    for (const msg of expired) {
      const reactions = await ctx.db
        .query('reactions')
        .withIndex('by_message', (q) => q.eq('messageId', msg._id))
        .collect();
      for (const r of reactions) {
        await ctx.db.delete(r._id);
      }
      await ctx.db.delete(msg._id);
    }
  },
});
