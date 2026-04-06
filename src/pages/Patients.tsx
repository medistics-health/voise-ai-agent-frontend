import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  CheckSquare,
  CalendarRange,
  Pencil,
  Phone,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Users,
} from "lucide-react";
import api from "../lib/api";
import AppModal from "../components/AppModal";
import PageHeader from "../components/PageHeader";
import TablePagination from "../components/TablePagination";
import AddressInput from "../components/AddressInput";
import { useCall } from "../contexts/CallContext";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dob: string;
  gender?: string;
  email?: string;
  mobileNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  payerName: string;
  payerMemberId?: string;
  chartNumber?: string | null;
  pref?: "Group" | "Provider" | null;
  providerId?: string | null;
  practiceLocationId?: string | null;
  groupId?: string | null;
  insuranceId?: string | null;
  memberPlanStatus?: string | null;
  memberPlanStatusUpdatedAt?: string | null;
  provider?: { id: string; name: string; npi: string } | null;
  practiceLocation?: { id: string; name: string; npi: string } | null;
  group?: { id: string; name: string; category: string } | null;
  insurance?: { id: string; name: string; phone?: string | null } | null;
}
interface PatientFormValues {
  firstName: string;
  lastName: string;
  middleName: string;
  dob: string;
  gender: string;
  email: string;
  mobileNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  payerName: string;
  payerMemberId: string;
  chartNumber: string;
  pref: "Group" | "Provider" | "";
  providerId: string | null;
  practiceLocationId: string | null;
  groupId: string | null;
  insuranceId: string | null;
  memberPlanStatus: string;
}
interface Provider {
  id: string;
  name: string;
  npi: string;
}
interface PracticeLocation {
  id: string;
  name: string;
  npi: string;
}
interface Group {
  id: string;
  name: string;
  category: string;
}
interface Insurance {
  id: string;
  name: string;
}
interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
interface Filters {
  practiceLocationId?: string;
  groupId?: string;
  providerId?: string;
  insuranceId?: string;
  memberPlanStatus?: string;
  statusDateFrom?: string;
  statusDateTo?: string;
}
interface QueueForm {
  patientIds: string[];
  patientLabel: string;
  name: string;
  description: string;
  scheduledAt: string;
}

const defaultValues: PatientFormValues = {
  firstName: "",
  lastName: "",
  middleName: "",
  dob: "",
  gender: "",
  email: "",
  mobileNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  payerName: "",
  payerMemberId: "",
  chartNumber: "",
  pref: "",
  providerId: null,
  practiceLocationId: null,
  groupId: null,
  insuranceId: null,
  memberPlanStatus: "",
};
const defaultFilters: Filters = {
  practiceLocationId: "",
  groupId: "",
  providerId: "",
  insuranceId: "",
  memberPlanStatus: "",
  statusDateFrom: "",
  statusDateTo: "",
};
const defaultPagination: Pagination = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};
const statusOptions = [
  "Active",
  "Inactive",
  "Unknown",
  "Error",
  "No Answer",
  "Filed",
  "Pending",
] as const;
const queryStatusOptions = [
  { value: "", label: "All statuses" },
  { value: "null", label: "Unverified" },
  ...statusOptions.map((status) => ({ value: status, label: status })),
];
const statusClasses: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Inactive: "bg-red-100 text-red-700 border border-red-200",
  Unknown: "bg-slate-100 text-slate-700 border border-slate-200",
  Error: "bg-orange-100 text-orange-700 border border-orange-200",
  "No Answer": "bg-amber-100 text-amber-700 border border-amber-200",
  Filed: "bg-violet-100 text-violet-700 border border-violet-200",
  Pending: "bg-blue-100 text-blue-700 border border-blue-200",
  Unverified: "bg-brand-50 text-brand-700 border border-brand-200",
};

const label = (text: string, required = false) => (
  <label className="label">
    {text}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);
const formatDate = (value?: string | null) =>
  !value
    ? "Not updated yet"
    : Number.isNaN(new Date(value).getTime())
      ? value
      : new Date(value).toLocaleString();
const statusChip = (status?: string | null) => {
  const text = status || "Unverified";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClasses[text] || statusClasses.Unknown}`}
    >
      {text}
    </span>
  );
};
const addressText = (patient: Patient) =>
  [
    patient.addressLine1,
    patient.addressLine2,
    [patient.city, patient.state].filter(Boolean).join(", "),
    patient.zip,
  ]
    .filter(Boolean)
    .join(" ");

const buildPatientLookupData = (patient: Patient) => ({
  id: patient.id,
  firstName: patient.firstName,
  lastName: patient.lastName,
  middleName: patient.middleName || null,
  dob: patient.dob,
  gender: patient.gender || null,
  email: patient.email || null,
  mobileNumber: patient.mobileNumber || null,
  addressLine1: patient.addressLine1 || null,
  addressLine2: patient.addressLine2 || null,
  city: patient.city || null,
  state: patient.state || null,
  zip: patient.zip || null,
  payerMemberId: patient.payerMemberId || null,
  memberPlanStatus: patient.memberPlanStatus || null,
  memberPlanStatusUpdatedAt: patient.memberPlanStatusUpdatedAt || null,
  provider: patient.provider || null,
  practiceLocation: patient.practiceLocation || null,
  insurance: patient.insurance || null,
});

export default function Patients() {
  const { startCall, status: callStatus } = useCall();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPagination);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [queueSaving, setQueueSaving] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queueForm, setQueueForm] = useState<QueueForm | null>(null);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [practiceLocations, setPracticeLocations] = useState<
    PracticeLocation[]
  >([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<PatientFormValues>({ defaultValues });

  /* ──────────────────────────────────────────────
   * FIX 1: fetchPatients now accepts search param
   *         and passes ALL filter fields to the API
   * ────────────────────────────────────────────── */
  const fetchPatients = useCallback(
    async (page: number, currentFilters: Filters, currentSearch: string) => {
      setLoading(true);
      try {
        const response = await api.get(`/patients`, {
          params: {
            page,
            search: currentSearch || undefined,
            practiceLocationId: currentFilters.practiceLocationId || undefined,
            groupId: currentFilters.groupId || undefined,
            providerId: currentFilters.providerId || undefined,
            insuranceId: currentFilters.insuranceId || undefined,
            memberPlanStatus: currentFilters.memberPlanStatus || undefined,
            statusDateFrom: currentFilters.statusDateFrom || undefined,
            statusDateTo: currentFilters.statusDateTo || undefined,
          },
        });

        // ✅ FIX: Match the same nested structure used in fetchLookups
        const body = response.data?.data ?? response.data;
        setPatients(body?.patients ?? []);
        setPagination(body?.pagination ?? defaultPagination);
      } catch {
        toast.error("Failed to fetch patients.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchLookups = useCallback(async () => {
    try {
      const [providersRes, locsRes, groupsRes, insurancesRes] =
        await Promise.all([
          api.get("/providers", { params: { limit: 100 } }),
          api.get("/practice-locations", { params: { limit: 100 } }),
          api.get("/groups", { params: { limit: 100 } }),
          api.get("/insurances", { params: { limit: 100 } }),
        ]);
      setProviders(providersRes.data?.data?.providers ?? []);
      setPracticeLocations(locsRes.data?.data?.practiceLocations ?? []);
      setGroups(groupsRes.data?.data?.groups ?? []);
      setInsurances(insurancesRes.data?.data?.insurances ?? []);
    } catch (err) {
      console.error("Failed to load dropdown data", err);
      toast.error("Failed to load dropdown data");
    }
  }, []);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue.trim()), 350);
    return () => clearTimeout(timer);
  }, [inputValue]);

  /* ──────────────────────────────────────────────
   * FIX 2: single useEffect that refetches when
   *         filters OR search change, always
   *         resets to page 1
   * ────────────────────────────────────────────── */
  useEffect(() => {
    fetchPatients(1, filters, search);
    setSelectedPatientIds([]); // clear selection on filter/search change
  }, [fetchPatients, filters, search]);

  const openCreateModal = () => {
    setEditingPatient(null);
    reset(defaultValues);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setEditingPatient(null);
    reset(defaultValues);
    setIsModalOpen(false);
  };
  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    reset({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      middleName: patient.middleName || "",
      dob: patient.dob || "",
      gender: patient.gender || "",
      email: patient.email || "",
      mobileNumber: patient.mobileNumber || "",
      addressLine1: patient.addressLine1 || "",
      addressLine2: patient.addressLine2 || "",
      city: patient.city || "",
      state: patient.state || "",
      zip: patient.zip || "",
      payerName: patient.payerName || "",
      payerMemberId: patient.payerMemberId || "",
      chartNumber: patient.chartNumber || "",
      pref: (patient.pref as "Group" | "Provider" | "") || "",
      providerId: patient.providerId || null,
      practiceLocationId: patient.practiceLocationId || null,
      groupId: patient.groupId || null,
      insuranceId: patient.insuranceId || null,
      memberPlanStatus: patient.memberPlanStatus || "",
    });
    setIsModalOpen(true);
  };

  const handleFilterChange = (key: keyof Filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => {
    setFilters(defaultFilters);
    setInputValue("");
    setSearch("");
  };
  const handleStatusDraftChange = (patientId: string, value: string) =>
    setStatusDrafts((current) => ({ ...current, [patientId]: value }));

  /* ──────────────────────────────────────────────
   * FIX 3: after status update, refetch with
   *         current filters + search, not defaults
   * ────────────────────────────────────────────── */
  const handleUpdateInsuranceStatus = async (patient: Patient) => {
    const memberPlanStatus = statusDrafts[patient.id];
    if (!memberPlanStatus) return toast.error("Select a status first");
    setStatusSavingId(patient.id);
    try {
      await api.patch(`/patients/${patient.id}/insurance-status`, {
        memberPlanStatus,
      });
      toast.success("Insurance status updated");
      await fetchPatients(pagination.page, filters, search);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update insurance status",
      );
    } finally {
      setStatusSavingId(null);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatientIds((current) =>
      current.includes(patientId)
        ? current.filter((id) => id !== patientId)
        : [...current, patientId],
    );
  };

  /* ──────────────────────────────────────────────
   * FIX 4: toggleSelectAll checks by actual IDs
   *         not just array length
   * ────────────────────────────────────────────── */
  const toggleSelectAllOnPage = () => {
    const pageIds = patients.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedPatientIds.includes(id));
    setSelectedPatientIds(allSelected ? [] : pageIds);
  };

  const openQueueModal = (patient: Patient) => {
    setQueueForm({
      patientIds: [patient.id],
      patientLabel: `${patient.firstName} ${patient.lastName}`,
      name: `${patient.firstName} ${patient.lastName} verification queue`,
      description: patient.practiceLocation?.name
        ? `Created from patients page for ${patient.practiceLocation.name}`
        : "Created from patients page",
      scheduledAt: "",
    });
    setQueueModalOpen(true);
  };

  const openBulkQueueModal = () => {
    if (selectedPatientIds.length === 0) {
      toast.error("Select at least one patient");
      return;
    }
    setQueueForm({
      patientIds: selectedPatientIds,
      patientLabel: `${selectedPatientIds.length} selected patients`,
      name: `Selected patients verification queue`,
      description: "Created from patients page bulk selection",
      scheduledAt: "",
    });
    setQueueModalOpen(true);
  };

  const createQueueForPatient = async () => {
    if (!queueForm) return;
    if (!queueForm.name.trim()) return toast.error("Queue name is required");
    setQueueSaving(true);
    try {
      await api.post("/call-queues", {
        name: queueForm.name.trim(),
        description: queueForm.description.trim() || undefined,
        filterType: "specific_patients",
        patientIds: queueForm.patientIds,
        scheduledAt: queueForm.scheduledAt || undefined,
      });
      toast.success(`${queueForm.patientLabel} added to queue`);
      setQueueModalOpen(false);
      setQueueForm(null);
      setSelectedPatientIds([]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create queue");
    } finally {
      setQueueSaving(false);
    }
  };

  /* ──────────────────────────────────────────────
   * FIX 5: after create/edit, refetch with current
   *         filters + search
   * ────────────────────────────────────────────── */
  const onSubmit = async (values: PatientFormValues) => {
    setSaving(true);
    try {
      const submitData = {
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName,
        dob: values.dob,
        gender: values.gender,
        email: values.email,
        mobileNumber: values.mobileNumber,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        zip: values.zip,
        payerName: values.payerName,
        payerMemberId: values.payerMemberId || undefined,
        chartNumber: values.chartNumber || undefined,
        pref: values.pref || undefined,
        providerId: values.providerId || null,
        practiceLocationId: values.practiceLocationId || null,
        groupId: values.groupId || null,
        insuranceId: values.insuranceId || null,
        memberPlanStatus: values.memberPlanStatus || undefined,
      };
      if (editingPatient) {
        await api.put(`/patients/${editingPatient.id}`, submitData);
        toast.success("Patient updated");
      } else {
        await api.post("/patients", submitData);
        toast.success("Patient created");
      }
      closeModal();
      await fetchPatients(1, filters, search);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to save patient");
    } finally {
      setSaving(false);
    }
  };

  const totalUnverified = patients?.filter(
    (patient) => !patient.memberPlanStatus,
  ).length;
  const totalActive = patients?.filter(
    (patient) => patient.memberPlanStatus === "Active",
  ).length;
  const totalNeedsReview = patients?.filter((patient) =>
    ["Unknown", "Error", "No Answer"].includes(patient.memberPlanStatus || ""),
  ).length;

  /* ──────────────────────────────────────────────
   * FIX 6: check actual IDs, not just count
   * ────────────────────────────────────────────── */
  const allSelectedOnPage =
    patients?.length > 0 &&
    patients?.every((p) => selectedPatientIds.includes(p.id));

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Patients"
        subtitle="Track verification status, review linked data, and push patients into call queues."
        icon={Users}
        action={
          <div className="flex gap-3">
            {/* FIX 7: Refresh uses current filters + search */}
            <button
              onClick={() =>
                fetchPatients(pagination.page || 1, filters, search)
              }
              className="btn-ghost inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={openBulkQueueModal}
              disabled={selectedPatientIds.length === 0}
              className="btn-ghost inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckSquare size={14} />
              Queue Selected
            </button>
            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2"
            >
              <PlusCircle size={14} />
              Add Patient
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Total Patients
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">
            {pagination.total}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Unverified On Page
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">
            {totalUnverified}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active On Page
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">{totalActive}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Needs Review
          </p>
          <p className="text-3xl font-bold text-ink-950 mt-3">
            {totalNeedsReview}
          </p>
        </div>
      </div>

      <section className="glass-card p-5 space-y-4">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-[1180px] items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search by patient name..."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                className="input-field h-10 min-w-[250px] pl-9 text-sm"
              />
            </div>
            <select
              className="input-field h-10 min-w-[150px] text-sm"
              value={filters.practiceLocationId}
              onChange={(event) =>
                handleFilterChange("practiceLocationId", event.target.value)
              }
            >
              <option value="">All locations</option>
              {practiceLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <select
              className="input-field h-10 min-w-[170px] text-sm"
              value={filters.groupId}
              onChange={(event) =>
                handleFilterChange("groupId", event.target.value)
              }
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              className="input-field h-10 min-w-[145px] text-sm"
              value={filters.memberPlanStatus}
              onChange={(event) =>
                handleFilterChange("memberPlanStatus", event.target.value)
              }
            >
              {queryStatusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input-field h-10 min-w-[148px] text-sm"
              value={filters.statusDateFrom}
              onChange={(event) =>
                handleFilterChange("statusDateFrom", event.target.value)
              }
            />
            <input
              type="date"
              className="input-field h-10 min-w-[148px] text-sm"
              value={filters.statusDateTo}
              onChange={(event) =>
                handleFilterChange("statusDateTo", event.target.value)
              }
            />
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost h-10 whitespace-nowrap !px-4 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarRange size={13} />
            Status date filters use the insurance status updated date
          </span>
          <span>{selectedPatientIds.length} selected on this page</span>
          <span>Provider = individual doctor, Group = group entity</span>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="glass-card p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Users size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              No patients matched the current filters.
            </p>
          </div>
        ) : (
          <div className="table-shell overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                    <th className="px-4 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={allSelectedOnPage}
                        onChange={toggleSelectAllOnPage}
                        aria-label="Select all patients on this page"
                      />
                    </th>
                    <th className="px-4 py-2.5 text-left">Patient</th>
                    <th className="px-4 py-2.5 text-left">Contact</th>
                    <th className="px-4 py-2.5 text-left">Provider</th>
                    <th className="px-4 py-2.5 text-left">Group</th>
                    <th className="px-4 py-2.5 text-left">Practice Location</th>
                    <th className="px-4 py-2.5 text-left">Insurance</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-brand-50/35 transition-colors align-top"
                    >
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedPatientIds.includes(patient.id)}
                          onChange={() => togglePatientSelection(patient.id)}
                          aria-label={`Select ${patient.firstName} ${patient.lastName}`}
                        />
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <p className="font-semibold text-ink-950">
                          {patient.firstName}{" "}
                          {patient.middleName ? `${patient.middleName} ` : ""}
                          {patient.lastName}
                        </p>
                        <p className="text-slate-500 mt-1">
                          DOB: {patient.dob}
                          {patient.gender ? ` • ${patient.gender}` : ""}
                        </p>
                        <p className="text-slate-500 mt-1">
                          {addressText(patient) || "No address on file"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[170px] text-slate-600">
                        <p>{patient.mobileNumber || "No mobile number"}</p>
                        <p className="mt-1">
                          {patient.email || "No email address"}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {patient.payerName || "No payer"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[160px] text-slate-600">
                        <p className="font-semibold text-ink-950">
                          {patient.provider?.name || "Not linked"}
                        </p>
                        <p className="text-slate-500 mt-1">
                          NPI: {patient.provider?.npi || "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[170px] text-slate-600">
                        <p className="font-semibold text-ink-950">
                          {patient.group?.name || "Not linked"}
                        </p>
                        <p className="text-slate-500 mt-1">
                          Category: {patient.group?.category || "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[160px] text-slate-600">
                        <p className="font-semibold text-ink-950">
                          {patient.practiceLocation?.name || "Not linked"}
                        </p>
                        <p className="text-slate-500 mt-1">
                          NPI: {patient.practiceLocation?.npi || "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[160px] text-slate-600">
                        <p className="font-semibold text-ink-950">
                          {patient.insurance?.name || "Not linked"}
                        </p>
                        <p className="text-slate-500 mt-1">
                          Member ID: {patient.payerMemberId || "N/A"}
                        </p>
                      </td>
                      <td className="px-4 py-3 min-w-[190px]">
                        <div className="space-y-2">
                          {statusChip(patient.memberPlanStatus)}
                          <select
                            className="input-field h-9 min-w-[132px] !py-1.5 !text-xs"
                            value={statusDrafts[patient.id] || ""}
                            onChange={(event) =>
                              handleStatusDraftChange(
                                patient.id,
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select status</option>
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-slate-500">
                            Updated:{" "}
                            {formatDate(patient.memberPlanStatusUpdatedAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[170px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateInsuranceStatus(patient)}
                            disabled={statusSavingId === patient.id}
                            title="Save insurance status"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save
                              size={14}
                              className={
                                statusSavingId === patient.id
                                  ? "animate-pulse"
                                  : ""
                              }
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => openQueueModal(patient)}
                            title="Add to queue"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 bg-white text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <PlusCircle size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              startCall({
                                source: "patient_list",
                                patientMeta: {
                                  patientId: patient.id,
                                  name: `${patient.firstName} ${patient.lastName}`,
                                  dob: patient.dob,
                                  insuranceCompany: patient.insurance?.name,
                                  insurancePhone:
                                    patient.insurance?.phone || undefined,
                                  providerNpi:
                                    patient.provider?.npi || undefined,
                                  lookupData: buildPatientLookupData(patient),
                                },
                              })
                            }
                            disabled={
                              callStatus === "connected" ||
                              callStatus === "connecting"
                            }
                            title="Open patient call"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Phone size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(patient)}
                            title="Edit patient"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 bg-white text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          {/* FIX 8: pagination uses current filters + search */}
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={(page) => {
              if (page >= 1 && page <= pagination.totalPages)
                fetchPatients(page, filters, search);
            }}
          />
        </div>
      </section>

      {queueModalOpen && queueForm && (
        <AppModal
          title="Add Patient To Queue"
          subtitle={`Create a queue entry for ${queueForm.patientLabel}.`}
          onClose={() => !queueSaving && setQueueModalOpen(false)}
          maxWidthClassName="max-w-2xl"
        >
          <div className="p-6 space-y-4">
            <div>
              {label("Queue Name")}
              <input
                className="input-field"
                value={queueForm.name}
                onChange={(event) =>
                  setQueueForm((current) =>
                    current
                      ? { ...current, name: event.target.value }
                      : current,
                  )
                }
              />
            </div>
            <div>
              {label("Description")}
              <textarea
                className="input-field min-h-[88px]"
                value={queueForm.description}
                onChange={(event) =>
                  setQueueForm((current) =>
                    current
                      ? { ...current, description: event.target.value }
                      : current,
                  )
                }
              />
            </div>
            <div>
              {label("Scheduled Start")}
              <input
                type="datetime-local"
                className="input-field"
                value={queueForm.scheduledAt}
                onChange={(event) =>
                  setQueueForm((current) =>
                    current
                      ? { ...current, scheduledAt: event.target.value }
                      : current,
                  )
                }
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQueueModalOpen(false)}
                disabled={queueSaving}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createQueueForPatient}
                disabled={queueSaving}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusCircle size={14} />
                {queueSaving ? "Creating Queue..." : "Create Queue"}
              </button>
            </div>
          </div>
        </AppModal>
      )}

      {isModalOpen && (
        <AppModal
          title={editingPatient ? "Edit Patient" : "Add Patient"}
          subtitle="Required fields are marked with an asterisk."
          onClose={closeModal}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3"
          >
            <div>
              {label("First Name", true)}
              <input
                className="input-field"
                {...register("firstName", {
                  required: "First name is required",
                  minLength: { value: 2, message: "Minimum 2 characters" },
                  pattern: {
                    value: /^[A-Za-z\s'-]+$/,
                    message: "Only letters allowed",
                  },
                })}
              />
              {errors.firstName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              {label("Last Name", true)}
              <input
                className="input-field"
                {...register("lastName", {
                  required: "Last name is required",
                  minLength: { value: 2, message: "Minimum 2 characters" },
                  pattern: {
                    value: /^[A-Za-z\s'-]+$/,
                    message: "Only letters allowed",
                  },
                })}
              />
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div>
              {label("Middle Name")}
              <input
                className="input-field"
                {...register("middleName", {
                  pattern: {
                    value: /^[A-Za-z\s'-]*$/,
                    message: "Only letters allowed",
                  },
                })}
              />
              {errors.middleName && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.middleName.message}
                </p>
              )}
            </div>
            <div>
              {label("DOB", true)}
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                className="input-field"
                {...register("dob", { required: "DOB is required" })}
              />
              {errors.dob && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.dob.message}
                </p>
              )}
            </div>
            <div>
              {label("Gender", true)}
              <select
                className="input-field"
                {...register("gender", { required: "Gender is required" })}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.gender.message}
                </p>
              )}
            </div>
            <div>
              {label("Email")}
              <input
                type="email"
                className="input-field"
                {...register("email", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              {label("Mobile Number")}
              <input
                className="input-field"
                {...register("mobileNumber", {
                  pattern: {
                    value: /^[0-9()+\-\s]{7,20}$/,
                    message: "Enter a valid mobile number",
                  },
                })}
              />
              {errors.mobileNumber && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.mobileNumber.message}
                </p>
              )}
            </div>
            <div>
              {label("Practice Location")}
              <select
                className="input-field"
                {...register("practiceLocationId")}
              >
                <option value="">Select Location</option>
                {practiceLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} (NPI: {location.npi})
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Group")}
              <select className="input-field" {...register("groupId")}>
                <option value="">Select Group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Doctor (Provider)")}
              <select className="input-field" {...register("providerId")}>
                <option value="">Select Doctor</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} (NPI: {provider.npi})
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Insurance")}
              <select className="input-field" {...register("insuranceId")}>
                <option value="">Select insurance</option>
                {insurances.map((insurance) => (
                  <option key={insurance.id} value={insurance.id}>
                    {insurance.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              {label("Payer Name")}
              <input className="input-field" {...register("payerName")} />
            </div>
            <div>
              {label("Payer Member ID")}
              <input className="input-field" {...register("payerMemberId")} />
            </div>
            <div>
              {label("Chart Number")}
              <input className="input-field" {...register("chartNumber")} />
            </div>
            <div>
              {label("Preference")}
              <select className="input-field" {...register("pref")}>
                <option value="">Select Preference</option>
                <option value="Group">Group</option>
                <option value="Provider">Provider</option>
              </select>
            </div>
            <div>
              {label("Plan Status")}
              <select className="input-field" {...register("memberPlanStatus")}>
                <option value="">Select Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <AddressInput
              fieldNamePrefix="address"
              register={register}
              errors={errors}
              watch={watch}
              optional={true}
            />
            <div className="md:col-span-2 xl:col-span-3 flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusCircle size={14} />
                {saving
                  ? "Saving..."
                  : editingPatient
                    ? "Update Patient"
                    : "Create Patient"}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </AppModal>
      )}
    </div>
  );
}
