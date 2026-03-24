export const queryKeys = {
  stats: ["stats"] as const,
  messages: (bounds: string) => ["messages", bounds] as const,
  replies: (messageId: string) => ["replies", messageId] as const,
  reactions: (messageId: string, clientId: string) =>
    ["reactions", messageId, clientId] as const,
  random: (seed: number) => ["random", seed] as const,
  trendingToday: ["trending-today"] as const,
  trendingReactions: ["trending-reactions"] as const,
  radioQueuePreview: (afterMessageId: string) =>
    ["radio", "queue-preview", afterMessageId] as const,
};
