import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { DocumentFolder } from '@/types/domain';
export function useDeleteFolder(projectId: string) {
    const cache = useQueryClient(), requests = useRef(new Map<string, string>());
    return useMutation({ mutationFn: async (folder: DocumentFolder) => { const key = folder.id + ':' + folder.name; let request = requests.current.get(key); if (!request) {
            request = crypto.randomUUID();
            requests.current.set(key, request);
        } const r = await supabase.rpc('trash_project_archive', { p_project_id: projectId, p_kind: 'folder', p_root_id: folder.id, p_request_id: request, p_expected_name: folder.name }); if (r.error)
            throw r.error; requests.current.delete(key); return r.data; }, onSuccess: async () => { await Promise.all([cache.invalidateQueries({ queryKey: ['document-folders', projectId] }), cache.invalidateQueries({ queryKey: ['documents'] }), cache.invalidateQueries({ queryKey: ['project-document-index'] }), cache.invalidateQueries({ queryKey: ['document-trash', projectId] })]); } });
}
