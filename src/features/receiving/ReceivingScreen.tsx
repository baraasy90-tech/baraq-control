import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, Modal, ErrorText } from "@/components/ui";
import { ReceivingTree } from "@/features/receiving/ReceivingTree";
import { NewSubmissionForm } from "@/features/receiving/NewSubmissionForm";
import { SubmissionHistory } from "@/features/receiving/SubmissionHistory";
import { DecisionPill } from "@/features/receiving/DecisionPill";
import { useActivities } from "@/features/schedule/api/useActivities";
import { useCreateSubmission } from "@/features/receiving/api/useCreateSubmission";
import { useUpdateSubmission } from "@/features/receiving/api/useUpdateSubmission";
import { useDeleteSubmission } from "@/features/receiving/api/useDeleteSubmission";
import { printSubmissionReport } from "@/features/receiving/lib/printReport";
import { useCompany } from "@/features/company/useCompany";
import { computeSchedule } from "@/features/schedule/lib/schedule";
import { useCustomCalendarMap } from "@/features/schedule/api/useCustomCalendars";
import { getReceivingGate } from "@/features/schedule/lib/scope";
import { fmt } from "@/utils/dates";
import type { Decision, Project, Submission } from "@/types/domain";

interface SubmissionPayload {
  managerName: string;
  managerSignatureUrl: string | null;
  decision: Decision;
  notes: string | null;
  checklistResults: { checklistItemId: string; checked: boolean; imageUrl: string | null }[];
  images: string[];
}

export function ReceivingScreen({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const activitiesQuery = useActivities(project.id);
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  const deleteSubmission = useDeleteSubmission(project.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  const customCalendars = useCustomCalendarMap(company.id);
  const activities = activitiesQuery.data ?? [];
  const schedule = computeSchedule(activities, customCalendars);
  const selected = activities.find((a) => a.id === selectedId) ?? null;
  const gate = selected ? getReceivingGate(selected, activities, schedule) : null;

  const handlePrint = (submission: Submission) => {
    if (!selected) return;
    printSubmissionReport({
      projectName: project.name,
      activityName: selected.name,
      submission,
      checklistItems: selected.checklist,
      print: company.print,
    });
  };

  const handleSubmit = async (payload: SubmissionPayload) => {
    if (!selected) return;
    setError("");
    try {
      if (editingSubmission) {
        await updateSubmission.mutateAsync({ id: editingSubmission.id, projectId: project.id, ...payload });
      } else {
        await createSubmission.mutateAsync({ activityId: selected.id, projectId: project.id, ...payload });
      }
      setFormOpen(false);
      setEditingSubmission(null);
    } catch {
      setError("تعذّر حفظ التقديم، حاول مجدداً");
    }
  };

  const openNewSubmission = () => {
    setEditingSubmission(null);
    setFormOpen(true);
  };

  const openEditSubmission = (submission: Submission) => {
    setEditingSubmission(submission);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink truncate">الاستلام — {project.name}</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${project.id}`)}>رجوع</SecondaryButton>
      </div>

      {activitiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="lg:max-h-[70vh] lg:overflow-y-auto">
          <ReceivingTree activities={activities} selectedId={selectedId} onSelect={(a) => setSelectedId(a.id)} />
        </Card>

        <Card>
          {!selected ? (
            <p className="text-sm text-ink-soft">اختر بنداً من القائمة لعرض تفاصيل الاستلام</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-base font-bold text-ink truncate">{selected.name}</h2>
                <DecisionPill submissions={selected.submissions} />
              </div>

              {!selected.requiresReceiving ? (
                <p className="text-sm text-ink-soft mb-4">هذا البند لا يتطلب استلاماً</p>
              ) : gate && !gate.unlocked ? (
                <div className="bg-warn-bg text-warn text-sm rounded-lg p-3 mb-4">
                  {gate.reason === "date"
                    ? `الاستلام غير متاح بعد — تاريخ بداية البند ${fmt(gate.date)}`
                    : `الاستلام غير متاح — يجب اعتماد "${gate.predecessor.name}" (مع صور) أولاً`}
                </div>
              ) : (
                <PrimaryButton onClick={openNewSubmission} className="w-auto px-4 py-2 text-sm mb-4 inline-flex items-center gap-1.5">
                  <Plus size={15} strokeWidth={2.5} /> تقديم استلام جديد
                </PrimaryButton>
              )}

              <div>
                <h3 className="text-sm font-bold text-ink mb-2">سجل التقديمات</h3>
                <SubmissionHistory
                  activityName={selected.name}
                  submissions={selected.submissions}
                  checklistItems={selected.checklist}
                  onDelete={(submissionId) => deleteSubmission.mutate(submissionId)}
                  onEdit={openEditSubmission}
                  onPrint={handlePrint}
                  deleting={deleteSubmission.isPending}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {formOpen && selected && (
        <Modal
          title={editingSubmission ? `تعديل تقديم — ${selected.name}` : `تقديم استلام — ${selected.name}`}
          onClose={() => {
            setFormOpen(false);
            setEditingSubmission(null);
          }}
        >
          <ErrorText>{error}</ErrorText>
          <NewSubmissionForm
            activity={selected}
            defaultManagerName={project.managerName}
            defaultSignatureUrl={project.managerSignatureUrl}
            initial={editingSubmission}
            onSubmit={handleSubmit}
            onCancel={() => {
              setFormOpen(false);
              setEditingSubmission(null);
            }}
            submitting={createSubmission.isPending || updateSubmission.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
