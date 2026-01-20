import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "../../utils/constants";

export const TicketForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    category: "",
    priority: "MEDIUM",
    title: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get("/auth/profile");
      return response.data.data;
    },
  });

  // Get user's tenancy info
  const { data: myTenancy } = useQuery({
    queryKey: ["my-tenancy", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;

      // Get all tenants and find current user
      const response = await api.get("/tenants");
      const allTenants = response.data.data.tenants;
      const me = allTenants.find((t: any) => t.id === currentUser.id);

      if (!me || !me.tenancies) return null;

      // Find active tenancy
      const activeTenancy = me.tenancies.find(
        (t: any) => t.status === "ACTIVE",
      );
      return activeTenancy;
    },
    enabled: !!currentUser?.id,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!myTenancy?.unit?.id) {
        throw new Error("No active unit found. Please contact admin.");
      }

      const ticketData = {
        unitId: myTenancy.unit.id,
        category: data.category,
        priority: data.priority,
        title: data.title,
        description: data.description,
      };

      const response = await api.post("/tickets", ticketData);
      return response.data.data;
    },
    onSuccess: async (ticket) => {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
          await api.post(`/tickets/${ticket.id}/attachments`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (err) {
          console.error("File upload failed:", err);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Maintenance request submitted successfully!");
      navigate("/tenant/tickets");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create ticket",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!myTenancy?.unit) {
      toast.error("No active unit assigned. Please contact admin.");
      return;
    }
    createTicketMutation.mutate(formData);
  };

  const categoryOptions: Array<{ value: string; label: string }> =
    Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => ({
      value,
      label: String(label),
    }));

  const priorityOptions: Array<{ value: string; label: string }> =
    Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
      value,
      label: String(label),
    }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Report a Problem
        </h1>
        <p className="text-gray-600">Submit a maintenance request</p>
        {myTenancy?.unit && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Your Unit:</span> Unit{" "}
              {myTenancy.unit.unitNumber} - {myTenancy.unit.property.name}
            </p>
          </div>
        )}
        {!myTenancy && currentUser && (
          <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              <strong>Notice:</strong> No active unit assigned. Please contact
              property management.
            </p>
          </div>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Category *"
            options={categoryOptions}
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
          />

          <Select
            label="Priority *"
            options={priorityOptions}
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value })
            }
          />

          <Input
            label="Title *"
            placeholder="Brief description of the issue"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              rows={4}
              placeholder="Provide detailed information about the problem..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Photo/Video (Optional)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              isLoading={createTicketMutation.isPending}
              className="flex-1"
              disabled={!myTenancy?.unit}
            >
              Submit Request
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/tenant/tickets")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
