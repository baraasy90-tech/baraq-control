import { Link } from "react-router-dom";
import { QueryFailureScreen } from "./QueryFailureScreen";

export function ProjectQueryState({ query }: { query: {
  isError: boolean; isPending: boolean; data: unknown; refetch: () => Promise<unknown>;
} }) {
  if (query.isError) return <QueryFailureScreen title="بيانات المشروع" retry={() => query.refetch()} />;
  if (query.isPending) return <p role="status" className="p-6">جارٍ تحميل بيانات المشروع...</p>;
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <p role="alert" className="mb-4">المشروع غير موجود أو لا تملك صلاحية الوصول إليه.</p>
      <Link to="/" className="text-primary">رجوع للمشاريع</Link>
    </div>
  );
}
