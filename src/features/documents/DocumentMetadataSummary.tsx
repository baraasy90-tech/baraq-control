import type { ProjectDocument } from '@/types/domain';
import {documentCategoryLabel} from './documentMetadata';
export function DocumentMetadataSummary({document:doc}:{document:ProjectDocument}) {
 const parts=[documentCategoryLabel(doc.category),doc.referenceNumber,doc.documentDate].filter(Boolean);
 if(!parts.length&&!doc.description)return null;
 return <div aria-label="بيانات الوثيقة" className="text-xs text-ink-soft mt-2 break-words min-w-0">{!!parts.length&&<p className="m-0" dir="auto">{parts.join(' · ')}</p>}{doc.description&&<p className="mt-1 mb-0 line-clamp-2 whitespace-pre-wrap">{doc.description}</p>}</div>;
}
