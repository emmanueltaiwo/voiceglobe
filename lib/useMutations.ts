import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  uploadAudio,
  createMessage as createMessageApi,
  setReaction as setReactionApi,
} from "./api";
import { queryKeys } from "./queryKeys";

export function useCreateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      lat: number;
      lng: number;
      audioUrl: string;
      duration: number;
      replyTo?: string;
    }) => {
      const { audioUrl, ...rest } = params;
      await createMessageApi({ ...rest, audioUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.recent });
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingToday });
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingReactions });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useSetReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReactionApi,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reactions", variables.messageId],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.trendingReactions });
    },
  });
}
