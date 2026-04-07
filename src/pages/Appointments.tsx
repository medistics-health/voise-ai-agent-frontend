import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../lib/api";
import {
  Calendar,
  PlusCircle,
  Pencil,
  Trash2,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import AppModal from "../components/AppModal";
import PageHeader from "../components/PageHeader";
import TablePagination from "../components/TablePagination";
import { TableSkeleton } from "../components/Skeleton";

interface Appointment {
  id: string;
  patientId: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  reason: string | null;
  notes: string | null;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AppointmentForm {
  patientId: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string;
  notes: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-slate-100 text-slate-600",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-600",
    icon: XCircle,
  },
  no_show: {
    label: "No Show",
    color: "bg-amber-100 text-amber-700",
    icon: AlertCircle,
  },
};

const defaultForm: AppointmentForm = {
  patientId: "",
  providerName: "",
  appointmentDate: "",
  appointmentTime: "",
  appointmentType: "General",
  reason: "",
  notes: "",
};

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AppointmentForm>({ defaultValues: defaultForm });

  const fetchAppointments = useCallback(
    async (page: number, status: string) => {
      setLoading(true);
      try {
        const params: any = { page, limit: 20 };
        if (status && status !== "all") params.status = status;
        const res = await api.get("/appointments", { params });
        setAppointments(res.data.data.appointments ?? []);
        setPagination(res.data.data.pagination);
      } catch {
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get("/patients", {
        params: { limit: 100, page: 1 },
      });
      setPatients(res.data.data.patients ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAppointments(1, statusFilter);
    fetchPatients();
  }, [statusFilter, fetchAppointments, fetchPatients]);

  const openCreate = () => {
    setEditingAppt(null);
    reset(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    reset({
      patientId: appt.patientId,
      providerName: appt.providerName,
      appointmentDate: appt.appointmentDate,
      appointmentTime: appt.appointmentTime,
      appointmentType: appt.appointmentType,
      reason: appt.reason || "",
      notes: appt.notes || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingAppt(null);
    reset(defaultForm);
    setIsModalOpen(false);
  };

  const onSubmit = async (values: AppointmentForm) => {
    setSaving(true);
    try {
      if (editingAppt) {
        await api.put(`/appointments/${editingAppt.id}`, values);
        toast.success("Appointment updated");
      } else {
        await api.post("/appointments", values);
        toast.success("Appointment created");
      }
      closeModal();
      fetchAppointments(1, statusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success(`Appointment ${status}`);
      fetchAppointments(pagination.page, statusFilter);
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteAppt = async (id: string) => {
    if (!confirm("Delete this appointment?")) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success("Appointment deleted");
      fetchAppointments(1, statusFilter);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const seedAppointments = async () => {
    try {
      await api.post("/appointments/seed");
      toast.success("Sample appointments added");
      fetchAppointments(1, statusFilter);
    } catch {
      toast.error("Failed to seed");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Manage patient appointments. The AI receptionist reads from this data for scheduling lookups."
        icon={Calendar}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="btn-primary inline-flex items-center gap-2 text-xs"
            >
              <PlusCircle size={14} /> Add Appointment
            </button>
          </div>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-shell">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No appointments found.</p>
            <button
              onClick={seedAppointments}
              className="btn-primary text-xs mt-3"
            >
              Add Sample Appointments
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Patient</th>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Time</th>
                  <th className="px-4 py-2.5 text-left">Provider</th>
                  <th className="px-4 py-2.5 text-left">Type</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Reason</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {appointments.map((appt) => {
                  const sc =
                    statusConfig[appt.status] || statusConfig.scheduled;
                  const StatusIcon = sc.icon;
                  return (
                    <tr
                      key={appt.id}
                      className="hover:bg-brand-50/40 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center border border-brand-100">
                            <User size={11} className="text-brand-600" />
                          </div>
                          <span className="font-semibold text-ink-950">
                            {appt.patient
                              ? `${appt.patient.firstName} ${appt.patient.lastName}`
                              : "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-semibold">
                        {formatDate(appt.appointmentDate)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {appt.appointmentTime}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {appt.providerName}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {appt.appointmentType}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}
                        >
                          <StatusIcon size={10} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">
                        {appt.reason || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {appt.status === "scheduled" && (
                            <button
                              onClick={() => updateStatus(appt.id, "confirmed")}
                              className="btn-ghost px-2 py-1 text-[10px] text-green-600"
                              title="Confirm"
                            >
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {(appt.status === "scheduled" ||
                            appt.status === "confirmed") && (
                            <button
                              onClick={() => updateStatus(appt.id, "cancelled")}
                              className="btn-ghost px-2 py-1 text-[10px] text-red-500"
                              title="Cancel"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(appt)}
                            className="btn-ghost px-2 py-1 text-[10px]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteAppt(appt.id)}
                            className="btn-ghost px-2 py-1 text-[10px] text-red-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(p) => fetchAppointments(p, statusFilter)}
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <AppModal
          title={editingAppt ? "Edit Appointment" : "Add Appointment"}
          subtitle="Schedule a patient appointment."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="label">
                Patient <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                {...register("patientId", { required: "Patient is required" })}
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.patientId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="input-field"
                  {...register("appointmentDate", {
                    required: "Date is required",
                  })}
                />
                {errors.appointmentDate && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.appointmentDate.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="10:30 AM"
                  className="input-field"
                  {...register("appointmentTime", {
                    required: "Time is required",
                  })}
                />
                {errors.appointmentTime && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.appointmentTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  Provider <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Dr. Smith"
                  className="input-field"
                  {...register("providerName", {
                    required: "Provider is required",
                  })}
                />
                {errors.providerName && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.providerName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  className="input-field"
                  {...register("appointmentType")}
                >
                  <option value="General">General</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Procedure">Procedure</option>
                  <option value="Lab Work">Lab Work</option>
                  <option value="Physical">Physical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Reason</label>
              <input
                type="text"
                placeholder="Reason for visit"
                className="input-field"
                {...register("reason")}
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                rows={2}
                placeholder="Additional notes..."
                className="input-field"
                {...register("notes")}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <PlusCircle size={14} />
                {saving ? "Saving..." : editingAppt ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
