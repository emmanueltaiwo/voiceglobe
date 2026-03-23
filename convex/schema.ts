import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  messages: defineTable({
    lat: v.number(),
    lng: v.number(),
    audioUrl: v.string(),
    duration: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
    replyTo: v.optional(v.id('messages')),
    countryCode: v.optional(v.string()),
    isFirstInCountry: v.optional(v.boolean()),
  })
    .index('by_expiry', ['expiresAt'])
    .index('by_reply', ['replyTo'])
    .index('by_location', ['lat', 'lng'])
    .index('by_createdAt', ['createdAt'])
    .index('by_country', ['countryCode']),

  reactions: defineTable({
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
  })
    .index('by_message', ['messageId'])
    .index('by_message_client', ['messageId', 'clientId']),
});
