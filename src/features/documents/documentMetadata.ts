export const documentCategories = {
 drawing:'مخططات', contract:'عقود', report:'تقارير', correspondence:'مراسلات', approval:'اعتمادات', schedule:'جداول زمنية', invoice:'فواتير', other:'أخرى',
} as const;
export type DocumentCategory=keyof typeof documentCategories;
export interface DocumentMetadata {category:DocumentCategory|null;referenceNumber:string|null;documentDate:string|null;description:string|null}
export function cleanDocumentMetadata(input:DocumentMetadata):DocumentMetadata {
 const referenceNumber=input.referenceNumber?.trim()||null,description=input.description?.trim()||null,documentDate=input.documentDate||null;
 if(input.category!==null&&!Object.hasOwn(documentCategories,input.category))throw new Error('اختر تصنيفاً صالحاً.');
 if(Array.from(referenceNumber??'').length>120)throw new Error('الرقم المرجعي لا يتجاوز 120 حرفاً.');
 if(Array.from(description??'').length>2000)throw new Error('وصف الوثيقة لا يتجاوز 2000 حرف.');
 if(documentDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(documentDate)||documentDate<'0001-01-01'||documentDate>'9999-12-31'||Number.isNaN(Date.parse(documentDate))||new Date(documentDate).toISOString().slice(0,10)!==documentDate))throw new Error('أدخل تاريخ وثيقة صالحاً.');
 return {category:input.category,referenceNumber,documentDate,description};
}
export function documentCategoryLabel(category:string|null|undefined) {return category&&Object.hasOwn(documentCategories,category)?documentCategories[category as DocumentCategory]:'';}
