import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../lib/api";
import {
  HelpCircle,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import AppModal from "../components/AppModal";
import PageHeader from "../components/PageHeader";
import TablePagination from "../components/TablePagination";

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface FAQForm {
  category: string;
  question: string;
  answer: string;
  keywords: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const categories = [
  "general",
  "hours",
  "location",
  "insurance",
  "appointments",
  "emergency",
  "billing",
  "other",
];

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FAQForm>({
    defaultValues: {
      category: "general",
      question: "",
      answer: "",
      keywords: "",
    },
  });

  const fetchFaqs = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const res = await api.get("/faq", {
        params: { page, limit: 50, search: searchTerm },
      });
      setFaqs(res.data.data.faqs ?? []);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs(1, search);
  }, [search, fetchFaqs]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(inputValue), 350);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const openCreate = () => {
    setEditingFaq(null);
    reset({ category: "general", question: "", answer: "", keywords: "" });
    setIsModalOpen(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    reset({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords.join(", "),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingFaq(null);
    setIsModalOpen(false);
  };

  const onSubmit = async (values: FAQForm) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        keywords: values.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      if (editingFaq) {
        await api.put(`/faq/${editingFaq.id}`, payload);
        toast.success("FAQ updated");
      } else {
        await api.post("/faq", payload);
        toast.success("FAQ created");
      }
      closeModal();
      fetchFaqs(1, search);
    } catch {
      toast.error("Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (faq: FAQ) => {
    try {
      await api.put(`/faq/${faq.id}`, { isActive: !faq.isActive });
      toast.success(faq.isActive ? "FAQ deactivated" : "FAQ activated");
      fetchFaqs(pagination.page, search);
    } catch {
      toast.error("Failed to update FAQ");
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete this FAQ entry?")) return;
    try {
      await api.delete(`/faq/${id}`);
      toast.success("FAQ deleted");
      fetchFaqs(1, search);
    } catch {
      toast.error("Failed to delete FAQ");
    }
  };

  const seedDefaults = async () => {
    try {
      await api.post("/faq/seed");
      toast.success("Default FAQs added");
      fetchFaqs(1, "");
    } catch {
      toast.error("Failed to seed FAQs");
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="FAQ Management"
        subtitle="Configure answers the AI receptionist uses when callers ask common questions."
        icon={HelpCircle}
        action={
          <div className="flex items-center gap-2">
            <button onClick={seedDefaults} className="btn-ghost text-xs">
              Seed Defaults
            </button>
            <button
              onClick={openCreate}
              className="btn-primary inline-flex items-center gap-2 text-xs"
            >
              <PlusCircle size={14} /> Add FAQ
            </button>
          </div>
        }
      />

      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          placeholder="Search FAQs..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="p-16 text-center">
            <HelpCircle size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No FAQ entries found.</p>
            <button onClick={seedDefaults} className="btn-primary text-xs mt-3">
              Add Default FAQs
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-[0.15em] border-b border-brand-100 bg-brand-50/80">
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Question</th>
                  <th className="px-4 py-2.5 text-left">Answer</th>
                  <th className="px-4 py-2.5 text-left">Active</th>
                  <th className="px-4 py-2.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {faqs.map((faq) => (
                  <tr
                    key={faq.id}
                    className="hover:bg-brand-50/40 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium capitalize">
                        {faq.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-950 max-w-[250px]">
                      <p className="line-clamp-2">{faq.question}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[300px]">
                      <p className="line-clamp-2">{faq.answer}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleActive(faq)}
                        className="text-slate-400 hover:text-brand-600"
                      >
                        {faq.isActive ? (
                          <ToggleRight size={20} className="text-green-600" />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(faq)}
                          className="btn-ghost px-2 py-1.5 text-xs"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteFaq(faq.id)}
                          className="btn-ghost px-2 py-1.5 text-xs text-red-500"
                        >
                          <Trash2 size={12} />
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
          onPageChange={(p) => fetchFaqs(p, search)}
        />
      </div>

      {isModalOpen && (
        <AppModal
          title={editingFaq ? "Edit FAQ" : "Add FAQ"}
          subtitle="This answer will be used by the AI receptionist."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="label">
                Category<span className="text-red-500 ml-1">*</span>
              </label>
              <select
                className="input-field"
                {...register("category", { required: true })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">
                Question<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                className="input-field"
                placeholder="What are your office hours?"
                {...register("question", { required: "Question is required" })}
              />
              {errors.question && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.question.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">
                Answer<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                rows={4}
                className="input-field"
                placeholder="Our office is open Monday through Friday..."
                {...register("answer", { required: "Answer is required" })}
              />
              {errors.answer && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.answer.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">Keywords (comma-separated)</label>
              <input
                className="input-field"
                placeholder="hours, open, close, time"
                {...register("keywords")}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 text-xs"
              >
                <PlusCircle size={14} />
                {saving
                  ? "Saving..."
                  : editingFaq
                    ? "Update FAQ"
                    : "Create FAQ"}
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
