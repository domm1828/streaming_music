import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getList, mutate } from '../../lib/http';

export interface CommentItem {
  _id: string;
  user: { _id: string; name: string; username: string; image?: string | null };
  content: string;
  timestamp: number | null;
  parent: string | null;
  votes: number;
  createdAt: string;
}

export interface CreateCommentInput {
  type: 'track' | 'album' | 'artist' | 'playlist';
  id: string;
  content: string;
  parentId?: string;
  timestamp?: number;
}

export function useComments(type: CreateCommentInput['type'], id: string) {
  return useQuery({
    queryKey: ['comments', type, id],
    queryFn: () => getList<CommentItem>('comments', { type, id, perPage: 50 }),
    enabled: Boolean(id),
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentInput) => mutate('post', 'comments', body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['comments', v.type, v.id] }),
  });
}

export function useDeleteComment(type: CreateCommentInput['type'], id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => mutate('delete', `comments/${commentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', type, id] }),
  });
}
