import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import {
  Plus,
  Search,
  Mail,
  Phone,
  Home,
  Edit,
  Trash2,
  Key,
} from "lucide-react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { formatDate } from "../../utils/helpers";

export const TenantManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState<any>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    unitId: "",
    leaseStart: "",
    leaseEnd: "",
    rentAmount: "1200",
    depositAmount: "2400",
  });

  const [editData, setEditData] = React.useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants", search],
    queryFn: async () => {
      const response = await api.get("/tenants", {
        params: { search, limit: 50 },
      });
      return response.data.data.tenants;
    },
  });

  const { data: availableUnits } = useQuery({
    queryKey: ["available-units"],
    queryFn: async () => {
      const response = await api.get("/units/available");
      return response.data.data;
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        email: data.email,
        password: data.password, // Admin sets password
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        unitId: data.unitId,
        leaseStart: new Date(data.leaseStart).toISOString(),
        leaseEnd: new Date(data.leaseEnd).toISOString(),
        rentAmount: parseFloat(data.rentAmount),
        depositAmount: data.depositAmount
          ? parseFloat(data.depositAmount)
          : undefined,
      };
      const response = await api.post("/tenants", payload);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["available-units"] });

      // Show password to admin
      const password = response.data.temporaryPassword;
      toast.success(
        `Tenant added! Login: ${formData.email} / Password: ${password}`,
        { duration: 10000 },
      );

      setShowAddModal(false);
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        unitId: "",
        leaseStart: "",
        leaseEnd: "",
        rentAmount: "1200",
        depositAmount: "2400",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add tenant");
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/tenants/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setShowEditModal(false);
      toast.success("Tenant updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update tenant");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const response = await api.patch(`/tenants/${id}`, { password });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setShowPasswordModal(false);
      setNewPassword("");
      toast.success(`Password reset! New password: ${newPassword}`, {
        duration: 8000,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reset password");
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/tenants/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete tenant");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.unitId ||
      !formData.leaseStart ||
      !formData.leaseEnd ||
      !formData.rentAmount
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    createTenantMutation.mutate(formData);
  };

  const handleEdit = (tenant: any) => {
    setSelectedTenant(tenant);
    setEditData({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      phone: tenant.phone || "",
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantMutation.mutate({ id: selectedTenant.id, data: editData });
  };

  const handleResetPassword = (tenant: any) => {
    setSelectedTenant(tenant);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    resetPasswordMutation.mutate({
      id: selectedTenant.id,
      password: newPassword,
    });
  };

  const handleDelete = (tenant: any) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${tenant.firstName} ${tenant.lastName}? This will remove all their data including tickets and cannot be undone.`,
      )
    ) {
      deleteTenantMutation.mutate(tenant.id);
    }
  };

  const unitOptions =
    availableUnits?.map((unit: any) => ({
      value: unit.id,
      label: `Unit ${unit.unitNumber} - ${unit.property.name}`,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          📋 Tenant Login System:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• When you add a tenant, you set their password</li>
          <li>• Give the tenant their email and password</li>
          <li>
            • Tenant can login immediately at:{" "}
            <strong>http://localhost:5173/login</strong>
          </li>
          <li>
            • You can reset passwords anytime using the "Reset Password" button
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tenant Management
          </h1>
          <p className="text-gray-600 mt-1">Add, edit, and manage tenants</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          Add Tenant
        </Button>
      </div>

      <Card>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            placeholder="Search tenants by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tenants && tenants.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lease Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant: any) => {
                  const activeTenancy = tenant.tenancies?.find(
                    (t: any) => t.status === "ACTIVE",
                  );
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {tenant.firstName.charAt(0)}
                            {tenant.lastName.charAt(0)}
                          </div>
                          <p className="font-medium text-gray-900">
                            {tenant.firstName} {tenant.lastName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} />
                            {tenant.email}
                          </div>
                          {tenant.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={14} />
                              {tenant.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTenancy ? (
                          <div className="flex items-center gap-2">
                            <Home size={16} className="text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Unit {activeTenancy.unit.unitNumber}
                              </p>
                              <p className="text-xs text-gray-600">
                                {activeTenancy.unit.property.name}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No active lease
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTenancy ? (
                          <div className="text-sm text-gray-900">
                            {formatDate(activeTenancy.leaseStart)} -{" "}
                            {formatDate(activeTenancy.leaseEnd)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTenancy ? (
                          <span className="text-sm font-semibold text-gray-900">
                            ${activeTenancy.rentAmount.toLocaleString()}/mo
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={tenant.isActive ? "success" : "gray"}>
                          {tenant.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Tenant"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleResetPassword(tenant)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                            title="Reset Password"
                          >
                            <Key size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(tenant)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Tenant"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No tenants found</p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              Add First Tenant
            </Button>
          </div>
        </Card>
      )}

      {/* ADD TENANT MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Tenant"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              <strong>📝 Note:</strong> After adding the tenant, share their
              login credentials with them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              required
            />
            <Input
              label="Last Name *"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              required
            />
          </div>

          <Input
            label="Email Address *"
            type="email"
            placeholder="john.doe@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />

          <Input
            label="Set Password *"
            type="text"
            placeholder="Create a password for this tenant"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <Select
            label="Assign Unit *"
            options={unitOptions}
            value={formData.unitId}
            onChange={(e) =>
              setFormData({ ...formData, unitId: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Lease Start Date *"
              type="date"
              value={formData.leaseStart}
              onChange={(e) =>
                setFormData({ ...formData, leaseStart: e.target.value })
              }
              required
            />
            <Input
              label="Lease End Date *"
              type="date"
              value={formData.leaseEnd}
              onChange={(e) =>
                setFormData({ ...formData, leaseEnd: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Rent ($) *"
              type="number"
              placeholder="1200"
              value={formData.rentAmount}
              onChange={(e) =>
                setFormData({ ...formData, rentAmount: e.target.value })
              }
              required
            />
            <Input
              label="Security Deposit ($)"
              type="number"
              placeholder="2400"
              value={formData.depositAmount}
              onChange={(e) =>
                setFormData({ ...formData, depositAmount: e.target.value })
              }
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={createTenantMutation.isPending}
              className="flex-1"
            >
              Add Tenant
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TENANT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Tenant"
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editData.firstName}
              onChange={(e) =>
                setEditData({ ...editData, firstName: e.target.value })
              }
            />
            <Input
              label="Last Name"
              value={editData.lastName}
              onChange={(e) =>
                setEditData({ ...editData, lastName: e.target.value })
              }
            />
          </div>

          <Input
            label="Phone"
            value={editData.phone}
            onChange={(e) =>
              setEditData({ ...editData, phone: e.target.value })
            }
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={updateTenantMutation.isPending}
              className="flex-1"
            >
              Save Changes
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Reset Password"
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-900">
              Resetting password for:{" "}
              <strong>
                {selectedTenant?.firstName} {selectedTenant?.lastName}
              </strong>
            </p>
          </div>

          <Input
            label="New Password *"
            type="text"
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="text-xs text-gray-600">
            <p>Password requirements:</p>
            <ul className="list-disc list-inside mt-1">
              <li>At least 8 characters</li>
              <li>Share this password with the tenant</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              isLoading={resetPasswordMutation.isPending}
              className="flex-1"
            >
              Reset Password
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
