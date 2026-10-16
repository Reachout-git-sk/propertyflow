import React from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Check, Copy, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { authService, Invite } from "../../services/auth.service";
import { formatDateTime } from "../../utils/helpers";

const roleOptions = [
  { value: "TENANT", label: "Tenant" },
  { value: "WORKER", label: "Worker" },
  { value: "ADMIN", label: "Admin" },
];

export const CreateInvite = () => {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("");
  const [error, setError] = React.useState("");
  // The code lives only in this page's memory. After "Done" (or leaving the page)
  // nobody can see it again, because the server keeps only its hash.
  const [invite, setInvite] = React.useState<Invite | null>(null);
  const [copied, setCopied] = React.useState(false);

  const createInviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      authService.createInvite(data.email, data.role),
    onSuccess: (data) => {
      setInvite(data);
      setCopied(false);
      setEmail("");
      setRole("");
    },
    onError: (err: any) => {
      // For example 409 "This email already has an account"
      setError(err.response?.data?.message || "Failed to create invite");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInvite(null);
    createInviteMutation.mutate({ email, role });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invite!.inviteCode);
      setCopied(true);
    } catch {
      // Browsers only allow the clipboard on https pages and on localhost
      toast.error("Could not copy. Select the code and copy it yourself.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite Users</h1>
        <p className="text-gray-600 mt-1">
          Create a one-time sign-up code for a new tenant, worker or admin
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How invites work:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enter the person's email and the role their account gets</li>
          <li>• The code works once, only for that email, for 7 days</li>
          <li>
            • They create their account at <strong>/signup</strong> with their
            email and the code
          </li>
          <li>• A new invite for the same email replaces the old code</li>
        </ul>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="new.person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Select
            label="Role"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="primary"
            isLoading={createInviteMutation.isPending}
          >
            <UserPlus size={20} />
            Create invite
          </Button>
        </form>
      </Card>

      {invite && (
        <Card title={`Invite code for ${invite.email} (${invite.role})`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg font-mono text-lg break-all">
                {invite.inviteCode}
              </code>
              <Button type="button" variant="secondary" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Valid until {formatDateTime(invite.expiresAt)}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>This code is shown only once.</strong> Give it to this
                person yourself, in person. Do not send it by email or chat:
                anyone who has the code and the email can create this account.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={() => setInvite(null)}
            >
              Done
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
