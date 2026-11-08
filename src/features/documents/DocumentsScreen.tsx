import type {Project} from '@/types/domain';
import {ProjectDocumentsWorkspace} from './ProjectDocumentsWorkspace';
export function DocumentsScreen({project}:{project:Project}){return <ProjectDocumentsWorkspace key={project.id} project={project}/>;}
