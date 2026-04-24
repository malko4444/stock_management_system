import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Boxes, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: "", form: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    else if (!emailRegex.test(form.email.trim()))
      next.email = "Enter a valid email address";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 6)
      next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      toast.success("Welcome back!");
    } catch (err) {
      const code = err?.code || "";
      const message =
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
          ? "Invalid email or password"
          : code === "auth/too-many-requests"
          ? "Too many attempts. Try again later."
          : "Unable to sign in. Please try again.";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    "w-full px-3 py-2.5 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-md relative">
            <Boxes size={26} />
            <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-xl bg-emerald-500 text-white grid place-items-center ring-2 ring-white">
              <Fingerprint size={14} />
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Scanner Bridge
          </h1>
          <p className="text-sm text-slate-500">
            Sign in with your Stock Manager admin account
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          {errors.form && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {errors.form}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
                className={`${inputBase} ${
                  errors.email ? "border-red-400" : "border-slate-300"
                }`}
                placeholder="admin@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="current-password"
                  className={`${inputBase} pr-10 ${
                    errors.password ? "border-red-400" : "border-slate-300"
                  }`}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Use the same credentials you use on the web dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
