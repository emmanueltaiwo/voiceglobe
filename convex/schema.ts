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
});
