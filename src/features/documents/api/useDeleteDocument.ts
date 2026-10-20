import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ProjectDocument } from '@/types/domain';
export function useDeleteDocument(projectId: string) {
    const cache = useQueryClient(), requests = useRef(new Map<string, string>());
    return useMutation({ mutationFn: async (doc: ProjectDocument) => { const key = doc.id + ':' + (doc.rowVersion ?? 0); let request = requests.current.get(key); if (!request) {
            request = crypto.randomUUID();
            requests.current.set(key, request);
        } const r = await supabase.rpc('trash_project_archive', { p_project_id: projectId, p_kind: 'document', p_root_id: doc.id, p_request_id: request, p_expected_version: doc.rowVersion ?? 0 }); if (r.error)
            throw r.error; requests.current.delete(key); return r.data; }, onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['documents'] }), cache.invalidateQueries({ queryKey: ['project-document-index'] }), cache.invalidateQueries({ queryKey: ['document-trash', projectId] })]); } });
}
