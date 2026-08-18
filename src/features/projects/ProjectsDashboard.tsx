import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { SecondaryButton, IconButton, Modal, ErrorText } from "@/components/ui";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { ProjectForm, type ProjectFormValues } from "@/features/projects/ProjectForm";
import { useProjects } from "@/features/projects/api/useProjects";
import { useCreateProject } from "@/features/projects/api/useCreateProject";
import { useUpdateProject } from "@/features/projects/api/useUpdateProject";
import { useDeleteProject } from "@/features/projects/api/useDeleteProject";
import type { Company, Project, ProjectStatus } from "@/types/domain";

const STATUS_SECTIONS: { status: ProjectStatus; title: string; color: string; bg: string }[] = [
  { status: "active", title: "مشاريع قائمة", color: "#2E6FE8", bg: "#EAF1FD" },
  { status: "preparing", title: "مشاريع تحت التجهيز", color: "#DFA22E", bg: "#FBF1DE" },
  { status: "completed", title: "مشاريع منتهية", color: "#2E9E52", bg: "#E5F5EA" },
];

export function ProjectsDashboard({
  company,
  onOpenControlPanel,
}: {
  company: Company;
  onOpenControlPanel: () => void;
}) {
  const navigate = useNavigate();
  const projectsQuery = useProjects(company.id);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject(company.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null);

  const openCreate = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleSave = async (values: ProjectFormValues) => {
    setError("");
    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, companyId: company.id, ...values });
      } else {
        await createProject.mutateAsync({ companyId: company.id, ...values });
      }
      setFormOpen(false);
      setEditingProject(null);
    } catch {
      setError("تعذّر حفظ المشروع، حاول مجدداً");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const changeStatus = (project: Project, status: ProjectStatus) => {
    if (project.status === status) return;
    updateProject.mutate({ id: project.id, companyId: company.id, status });
  };

  const projects = projectsQuery.data ?? [];

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      <div
        className="flex items-center justify-between gap-3 mb-4 rounded-xl px-4 py-3 sm:px-5 sm:py-4"
        style={{ background: company.headerColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {company.logoUrl && (
            <img src={company.logoUrl} alt={company.name} className="h-9 object-contain shrink-0 bg-white rounded p-1" />
          )}
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">{company.name}</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <SecondaryButton onClick={() => navigate("/departments")} className="text-sm bg-white/10 text-white border-white/30">
            الأقسام
          </SecondaryButton>
          <SecondaryButton onClick={() => navigate("/structure")} className="text-sm bg-white/10 text-white border-white/30">
            الهيكلة
          </SecondaryButton>
          <SecondaryButton onClick={() => navigate("/overview")} className="text-sm bg-white/10 text-white border-white/30">
            نظرة عامة على الأقسام
          </SecondaryButton>
          <SecondaryButton onClick={() => navigate("/tasks")} className="text-sm bg-white/10 text-white border-white/30">
            المهام
          </SecondaryButton>
          <SecondaryButton onClick={() => navigate("/approvals")} className="text-sm bg-white/10 text-white border-white/30">
            الاعتمادات
          </SecondaryButton>
          <SecondaryButton onClick={onOpenControlPanel} className="text-sm bg-white/10 text-white border-white/30">
            لوحة التحكم
          </SecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-5 text-center">
          <div className="text-2xl font-bold text-ink">{projects.length}</div>
          <div className="text-xs text-ink-soft mt-1">إجمالي المشاريع</div>
        </div>
        {STATUS_SECTIONS.map((section) => (
          <div key={section.status} className="bg-panel border border-line/60 shadow-sm rounded-xl p-5 text-center">
            <div className="text-2xl font-bold" style={{ color: section.color }}>
              {projects.filter((p) => p.status === section.status).length}
            </div>
            <div className="text-xs text-ink-soft mt-1">{section.title}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-ink">المشاريع</h2>
        <IconButton icon={Plus} label="مشروع جديد" onClick={openCreate} />
      </div>

      {projectsQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {projectsQuery.isError && <p className="text-sm text-critical">تعذّر تحميل المشاريع</p>}

      {projectsQuery.data && projects.length === 0 && (
        <div className="bg-panel border border-dashed border-line rounded-xl p-10 text-center text-sm text-ink-soft">
          لا توجد مشاريع بعد — اضغط "+" لإنشاء أول مشروع
        </div>
      )}

      <div className="flex flex-col gap-6">
        {STATUS_SECTIONS.map((section) => {
          const sectionProjects = projects.filter((p) => p.status === section.status);
          const isDragOver = dragOverStatus === section.status;
          return (
            <div
              key={section.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(section.status);
              }}
              onDragLeave={() => setDragOverStatus((prev) => (prev === section.status ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStatus(null);
                const project = projects.find((p) => p.id === draggingId);
                if (project) changeStatus(project, section.status);
                setDraggingId(null);
              }}
              style={{
                borderColor: section.color,
                background: isDragOver ? section.bg : undefined,
              }}
              className="rounded-xl border-2 border-dashed p-4 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: section.color }} />
                <h3 className="text-sm font-bold" style={{ color: section.color }}>
                  {section.title}
                </h3>
                <span
                  className="text-xs font-bold rounded-full px-2 py-0.5"
                  style={{ background: section.bg, color: section.color }}
                >
                  {sectionProjects.length}
                </span>
              </div>

              {sectionProjects.length === 0 ? (
                <div className="rounded-lg p-6 text-center text-xs text-ink-soft" style={{ background: section.bg }}>
                  لا توجد مشاريع هنا — اسحب بطاقة مشروع إليه أو غيّر حالته من البطاقة
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sectionProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={() => navigate(`/projects/${project.id}`)}
                      onEdit={() => openEdit(project)}
                      onDelete={() => setConfirmDeleteId(project.id)}
                      onStatusChange={(status) => changeStatus(project, status)}
                      draggable
                      onDragStart={() => setDraggingId(project.id)}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {formOpen && (
        <Modal title={editingProject ? "تعديل المشروع" : "مشروع جديد"} onClose={() => setFormOpen(false)}>
          <ErrorText>{error}</ErrorText>
          <ProjectForm
            initial={editingProject}
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
            saving={createProject.isPending || updateProject.isPending}
          />
        </Modal>
      )}

      {confirmDeleteId && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDeleteId(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف كل بياناته (المراحل، الاستلامات، الميزانية، المستندات) بشكل نهائي.
          </p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteId(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={() => handleDelete(confirmDeleteId)}
              disabled={deleteProject.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {deleteProject.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
