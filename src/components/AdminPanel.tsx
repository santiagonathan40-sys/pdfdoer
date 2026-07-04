import { useState } from "react";
import { ShieldCheck, UserPlus, UserMinus, AlertCircle, CheckCircle } from "lucide-react";
import { adminUpgradeUser, adminDowngradeUser, AuthUser } from "../services/authApi";

type AdminPanelProps = {
  currentUser: AuthUser | null;
};

const ADMIN_EMAIL = "pdfdoeradmin@gmail.com";

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [email, setEmail] = useState("");
  const [loadingAction, setLoadingAction] = useState<"upgrade" | "downgrade" | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL;

  const handleUpgrade = async () => {
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setMessageType("error");
      setMessage("Please enter the user's email address.");
      return;
    }

    try {
      setLoadingAction("upgrade");
      setMessage("");
      setMessageType("");

      const result = await adminUpgradeUser(targetEmail);

      setMessageType("success");
      setMessage(result.message || `${targetEmail} has been upgraded to Pro.`);
      setEmail("");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to upgrade user.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDowngrade = async () => {
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setMessageType("error");
      setMessage("Please enter the user's email address.");
      return;
    }

    try {
      setLoadingAction("downgrade");
      setMessage("");
      setMessageType("");

      const result = await adminDowngradeUser(targetEmail);

      setMessageType("success");
      setMessage(result.message || `${targetEmail} has been downgraded to Free.`);
      setEmail("");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Unable to downgrade user.");
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ShieldCheck size={22} />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900">Admin Controls</h3>
          <p className="mt-1 text-sm text-slate-600">
            Upgrade or downgrade a PDFDoer user account by email.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-4">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          User email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {message && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loadingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={17} />
            {loadingAction === "upgrade" ? "Upgrading..." : "Upgrade to Pro"}
          </button>

          <button
            type="button"
            onClick={handleDowngrade}
            disabled={loadingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserMinus size={17} />
            {loadingAction === "downgrade" ? "Downgrading..." : "Downgrade to Free"}
          </button>
        </div>
      </div>
    </div>
  );
}