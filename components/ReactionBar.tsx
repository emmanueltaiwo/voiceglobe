"use client";

import { motion } from "motion/react";
import useSWR from "swr";
import { getReactions, setReaction } from "@/lib/api";

const REACTIONS = [
  { emoji: "heart", label: "❤️" },
  { emoji: "laugh", label: "😂" },
  { emoji: "cry", label: "😢" },
  { emoji: "fire", label: "🔥" },
  { emoji: "clap", label: "👏" },
  { emoji: "mindblown", label: "🤯" },
  { emoji: "party", label: "🎉" },
  { emoji: "wow", label: "😮" },
] as const;

type Emoji =
  | "heart"
  | "laugh"
  | "cry"
  | "fire"
  | "clap"
  | "mindblown"
  | "party"
  | "wow";

type Props = {
  messageId: string;
  clientId: string | null;
  compact?: boolean;
};

const DEFAULT_COUNTS: Record<Emoji, number> & { myReaction: Emoji | null } = {
  heart: 0,
  laugh: 0,
  cry: 0,
  fire: 0,
  clap: 0,
  mindblown: 0,
  party: 0,
  wow: 0,
  myReaction: null,
};

export function ReactionBar({ messageId, clientId, compact }: Props) {
  const { data: reactions, mutate } = useSWR(
    clientId ? ["reactions", messageId, clientId] : null,
    () => (clientId ? getReactions(messageId, clientId) : null),
  );

  if (!clientId) return null;

  const handleClick = async (emoji: Emoji) => {
    await setReaction({ messageId, emoji, clientId });
    mutate();
  };

  const counts = reactions ?? DEFAULT_COUNTS;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${compact ? "gap-0.5" : "gap-2"}`}
    >
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji as Emoji] ?? 0;
        const isMine = counts.myReaction === emoji;
        return (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleClick(emoji)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 transition ${
              compact ? "px-1.5 py-0.5" : ""
            } ${
              isMine
                ? "bg-emerald-500/20 ring-1 ring-emerald-500/50"
                : "hover:bg-white/10"
            }`}
            title={`${count} ${emoji}`}
          >
            <span className={compact ? "text-sm" : "text-base"}>{label}</span>
            {count > 0 && (
              <span
                className={`font-mono text-slate-400 ${
                  compact ? "text-[9px]" : "text-[10px]"
                }`}
              >
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
