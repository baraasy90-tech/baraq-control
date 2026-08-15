import { Pencil, Trash2 } from "lucide-react";
import type { Project, ProjectStatus } from "@/types/domain";
import { IconButton } from "@/components/ui";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "preparing", label: "تحت التجهيز" },
  { value: "active", label: "قائم" },
  { value: "completed", label: "منتهٍ" },
];

export function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bg-panel border border-line/60 shadow-sm rounded-xl p-5 flex flex-col gap-4 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-xl shrink-0"
            style={{ background: `${project.themeColor}1a` }}
          >
            {project.themeIcon}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-ink truncate">{project.name}</div>
            <div className="text-xs text-ink-soft truncate">{project.managerName || "بدون مدير محدّد"}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {project.location && <span>📍 {project.location}</span>}
        {project.area && <span>{project.area} م²</span>}
        {project.unitsCount && <span>{project.unitsCount} وحدة</span>}
        <span>{project.projectType}</span>
      </div>

      <select
        value={project.status}
        onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
        onClick={(e) => e.stopPropagation()}
        className="text-xs border border-line rounded-lg px-2 py-1.5 bg-white text-ink-soft w-fit"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onOpen}
          className="flex-1 py-2 rounded-lg text-white text-sm font-bold cursor-pointer border-none"
          style={{ background: project.themeColor }}
        >
          فتح المشروع
        </button>
        <IconButton icon={Pencil} label="تعديل" onClick={onEdit} />
        <IconButton icon={Trash2} label="حذف" tone="critical" onClick={onDelete} />
      </div>
    </div>
  );
}
