import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../lib/api";
import { Building2, Search, Pencil, Trash2, PlusCircle } from "lucide-react";
import AppModal from "../components/AppModal";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import TablePagination from "../components/TablePagination";
import MultiSelect, { MultiSelectOption } from "../components/MultiSelect";
import { TableSkeleton } from "../components/Skeleton";

interface Group {
  id: string;
  name: string;
  npi?: string | null;
  category: "Practice" | "Payer";
  ein?: string | null;
  streetAddress?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  createdAt: string;
  providerIds?: string[];
}

interface GroupFormValues {
  name: string;
  npi: string;
  category: "Practice" | "Payer";
  ein: string;
  streetAddress: string;
  streetAddress2: string;
  city: string;
  state: string;
  zip: string;
  providerIds: string[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const defaultValues: GroupFormValues = {
  name: "",
  npi: "",
  category: "Practice",
  ein: "",
  streetAddress: "",
  streetAddress2: "",
  city: "",
  state: "",
  zip: "",
  providerIds: [],
};

const label = (text: string, required = false) => (
  <label className="label">
    {text}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allProviders, setAllProviders] = useState<MultiSelectOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<GroupFormValues>({ defaultValues });
  const providerIds = watch("providerIds");

  const fetchGroups = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const res = await api.get("/groups", {
        params: { page, limit: 10, search: searchTerm },
      });
      setGroups(res.data.data.groups ?? []);
      setPagination(
        res.data.data.pagination || {
          total: 0,
          page,
          limit: 10,
          totalPages: 0,
        },
      );
    } catch (err) {
      toast.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api.get("/providers", { params: { limit: 1000 } });
      setAllProviders(
        res.data.data.providers?.map((p: any) => ({
          id: p.id,
          name: p.name,
          label: p.npi,
        })) ?? [],
      );
    } catch (err) {
      toast.error("Failed to load providers");
    }
  }, []);

  useEffect(() => {
    fetchGroups(1, search);
  }, [search, fetchGroups]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350);
    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const openCreateModal = () => {
    setEditingGroup(null);
    reset(defaultValues);
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    reset({
      name: group.name || "",
      npi: group.npi || "",
      category: group.category || "Practice",
      ein: group.ein || "",
      streetAddress: group.streetAddress || "",
      streetAddress2: group.streetAddress2 || "",
      city: group.city || "",
      state: group.state || "",
      zip: group.zip || "",
      providerIds: group.providerIds || [],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingGroup(null);
    reset(defaultValues);
    setIsModalOpen(false);
  };

  const onSubmit = async (values: GroupFormValues) => {
    setSaving(true);
    try {
      if (editingGroup) {
        await api.put(`/groups/${editingGroup.id}`, {
          name: values.name.trim(),
          npi: values.npi.trim(),
          category: values.category,
          ein: values.ein.trim(),
          streetAddress: values.streetAddress.trim(),
          streetAddress2: values.streetAddress2.trim(),
          city: values.city.trim(),
          state: values.state.trim().toUpperCase(),
          zip: values.zip.trim(),
        });
        // Update provider relationships
        await api.put(`/groups/${editingGroup.id}/providers`, {
          providerIds: values.providerIds,
        });
        toast.success("Group updated");
      } else {
        const createRes = await api.post("/groups", {
          name: values.name.trim(),
          npi: values.npi.trim(),
          category: values.category,
          ein: values.ein.trim(),
          streetAddress: values.streetAddress.trim(),
          streetAddress2: values.streetAddress2.trim(),
          city: values.city.trim(),
          state: values.state.trim().toUpperCase(),
          zip: values.zip.trim(),
        });
        // Update provider relationships for new group
        if (values.providerIds.length > 0) {
          await api.put(`/groups/${createRes.data.data.id}/providers`, {
            providerIds: values.providerIds,
          });
        }
        toast.success("Group created");
      }
      closeModal();
      fetchGroups(1, search);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to save group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/groups/${groupToDelete.id}`);
      toast.success("Group deleted");
      setGroupToDelete(null);
      fetchGroups(1, search);
    } catch {
      toast.error("Unable to delete group");
    } finally {
      setDeleting(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchGroups(page, search);
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Groups"
        subtitle="Manage groups and assign providers to them."
        icon={Building2}
        action={
          <button
            onClick={openCreateModal}
            className="btn-primary inline-flex items-center gap-2 flex-shrink-0"
          >
            <PlusCircle size={14} /> Add Group
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          placeholder="Search groups..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={5} />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-16 text-center">
            <Building2 size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No groups found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-4 py-2.5 text-left">NPI</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Providers</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-brand-50/40 transition-colors"
                  >
                    <td className="px-4 py-2 text-ink-950 font-semibold text-xs">
                      {group.name}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      {group.npi || "-"}
                    </td>
                    <td className="px-4 py-2 text-slate-600 text-xs">
                      <span className="inline-block bg-brand-100 text-brand-700 px-2 py-1 rounded">
                        {group.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {group.providerIds && group.providerIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.providerIds.slice(0, 3).map((providerId) => {
                            const provider = allProviders.find(
                              (p) => p.id === providerId,
                            );

                            return (
                              <span
                                key={providerId}
                                className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs"
                              >
                                {provider?.name || "Unknown"}
                              </span>
                            );
                          })}

                          {group.providerIds.length > 3 && (
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                              +{group.providerIds.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(group)}
                          className="btn-ghost px-3 py-2 text-xs inline-flex items-center gap-2"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setGroupToDelete(group)}
                          className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-2"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={goToPage}
        />
      </div>

      {isModalOpen && (
        <AppModal
          title={editingGroup ? "Edit Group" : "Add Group"}
          subtitle="Required fields are marked with an asterisk."
          onClose={closeModal}
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 p-6 pb-48"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                {label("Name", true)}
                <input
                  className="input-field"
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 3, message: "Minimum 3 characters" },
                    maxLength: {
                      value: 255,
                      message: "Maximum 255 characters",
                    },
                    validate: (v) => v.trim().length > 0 || "Name cannot be only spaces",
                  })}
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                {label("NPI")}
                <input
                  className="input-field"
                  {...register("npi", {
                    maxLength: { value: 50, message: "Maximum 50 characters" },
                    pattern: {
                      value: /^\S*$/,
                      message: "No spaces allowed in NPI",
                    },
                  })}
                  placeholder="National Provider Identifier"
                />
                {errors.npi && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.npi.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                {label("Category", true)}
                <select
                  className="input-field"
                  {...register("category", {
                    required: "Category is required",
                  })}
                >
                  <option value="Practice">Practice</option>
                  <option value="Payer">Payer</option>
                </select>
                {errors.category && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                {label("EIN")}
                <input
                  className="input-field"
                  {...register("ein", {
                    maxLength: { value: 50, message: "Maximum 50 characters" },
                    pattern: {
                      value: /^\S*$/,
                      message: "No spaces allowed in EIN",
                    },
                  })}
                  placeholder="Employer Identification Number"
                />
                {errors.ein && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.ein.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              {label("Street Address")}
              <input
                className="input-field"
                {...register("streetAddress", {
                  maxLength: { value: 255, message: "Maximum 255 characters" },
                })}
                placeholder="1265 PATERSON PLANK RD"
              />
              {errors.streetAddress && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.streetAddress.message}
                </p>
              )}
            </div>

            <div>
              {label("Street Address 2")}
              <input
                className="input-field"
                {...register("streetAddress2", {
                  maxLength: { value: 255, message: "Maximum 255 characters" },
                })}
                placeholder="Apt, Floor, etc."
              />
              {errors.streetAddress2 && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.streetAddress2.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                {label("City")}
                <input
                  className="input-field"
                  {...register("city", {
                    maxLength: {
                      value: 100,
                      message: "Maximum 100 characters",
                    },
                  })}
                  placeholder="SECAUCUS"
                />
                {errors.city && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                {label("State")}
                <input
                  className="input-field"
                  {...register("state", {
                    maxLength: { value: 2, message: "Maximum 2 characters" },
                    pattern: {
                      value: /^[A-Za-z]{2}$/,
                      message: "State must be a 2-letter code",
                    },
                  })}
                  placeholder="NJ"
                  maxLength={2}
                />
                {errors.state && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.state.message}
                  </p>
                )}
              </div>

              <div>
                {label("ZIP Code")}
                <input
                  className="input-field"
                  {...register("zip", {
                    maxLength: { value: 10, message: "Maximum 10 characters" },
                    pattern: {
                      value: /^[0-9-]*$/,
                      message: "ZIP code must contain only digits or hyphens",
                    },
                  })}
                  placeholder="070943242"
                />
                {errors.zip && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.zip.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              {label("Providers")}
              <MultiSelect
                options={allProviders}
                selectedIds={providerIds}
                onChange={(ids) => setValue("providerIds", ids)}
                placeholder="Search and select providers..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                <PlusCircle size={14} />
                {saving
                  ? "Saving..."
                  : editingGroup
                    ? "Update Group"
                    : "Create Group"}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </AppModal>
      )}

      {groupToDelete && (
        <ConfirmDialog
          title="Delete Group"
          message={`Group "${groupToDelete.name}" will be deleted.`}
          confirmLabel="Delete Group"
          onConfirm={handleDelete}
          onClose={() => !deleting && setGroupToDelete(null)}
          confirmDisabled={deleting}
        />
      )}
    </div>
  );
}
