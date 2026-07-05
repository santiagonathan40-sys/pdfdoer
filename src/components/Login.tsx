import React, { useState } from "react";
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  X,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { User } from "../types";
import {
  loginUser,
  googleLoginUser,
  forgotPassword,
  resetPassword,
} from "../services/authApi";

interface LoginProps {
  onNavigate: (page: string) => void;
  onLogin: (user: User) => void;
}

type ResetStep = "email" | "code";

export default function Login({ onNavigate, onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [forgotOpen, setForgotOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const completeLogin = (user: any) => {
    onLogin({
      email: user.email,
      tier: user.tier,
      createdAt: user.createdAt || new Date().toLocaleDateString(),
    });

    onNavigate("home");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await loginUser({
        email: email.trim(),
        password,
      });

      if (!result.user) {
        setError("Unable to login. Please try again.");
        return;
      }

      completeLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("Google login failed. Please try again.");
      return;
    }

    setIsGoogleLoading(true);
    setError("");

    try {
      const result = await googleLoginUser({
        credential: credentialResponse.credential,
      });

      if (!result.user) {
        setError("Google login failed. Please try again.");
        return;
      }

      completeLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }

    setIsResetLoading(true);
    setResetError("");
    setResetMessage("");

    try {
      const result = await forgotPassword({
        email: resetEmail.trim(),
      });

      setResetMessage(
        result.message || "A password reset code has been sent to your email."
      );
      setResetStep("code");
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Unable to send reset code."
      );
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }

    if (!resetCode.trim()) {
      setResetError("Please enter the reset code sent to your email.");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }

    setIsResetLoading(true);
    setResetError("");
    setResetMessage("");

    try {
      const result = await resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        newPassword,
      });

      setResetMessage(result.message || "Password reset successful.");

      setTimeout(() => {
        setForgotOpen(false);
        setResetStep("email");
        setPassword("");
        setNewPassword("");
        setResetCode("");
        setEmail(resetEmail.trim());
      }, 1000);
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : "Unable to reset password."
      );
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-6 sm:px-8">
      <div className="w-full max-w-md space-y-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Secure Member Login
          </span>

          <h2 className="mt-4 text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Welcome back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your PDFDoer workspace and account limits.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google login failed. Please try again.")}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          {isGoogleLoading && (
            <p className="text-center text-xs text-slate-500">
              Signing in with Google...
            </p>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>

          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400">
              or sign in with email
            </span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit} id="login-form">
          <div className="space-y-4 rounded-md">
            <div>
              <label
                htmlFor="email-address"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>

                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="name@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password-field"
                  className="block text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  Password
                </label>

                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline font-medium"
                  onClick={() => {
                    setForgotOpen(true);
                    setResetEmail(email.trim());
                    setResetStep("email");
                    setResetError("");
                    setResetMessage("");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>

                <input
                  id="password-field"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Enter your password"
                />

                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] disabled:bg-slate-300 disabled:cursor-not-allowed"
            id="btn-submit-login"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging in...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <span>Sign In</span>
                <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => onNavigate("signup")}
              className="font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Sign up for free
            </button>
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Protected account access for PDFDoer users</span>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-3">
                  <KeyRound size={20} />
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  Reset your password
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {resetStep === "email"
                    ? "Enter your email and we will send you a reset code."
                    : "Enter the code from your email and set a new password."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {resetError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
                {resetError}
              </div>
            )}

            {resetMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
                {resetMessage}
              </div>
            )}

            {resetStep === "email" ? (
              <form className="mt-5 space-y-4" onSubmit={handleForgotPassword}>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50/20"
                    placeholder="name@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {isResetLoading ? "Sending code..." : "Send reset code"}
                </button>
              </form>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleResetPassword}>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50/20"
                    placeholder="name@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Reset Code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) =>
                      setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="block w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 tracking-[0.4em] text-center focus:outline-none focus:border-blue-500 bg-slate-50/20"
                    placeholder="000000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-3 pr-10 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-blue-500 bg-slate-50/20"
                      placeholder="Enter new password"
                      required
                    />

                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetLoading}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {isResetLoading ? "Resetting password..." : "Reset password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetStep("email");
                    setResetCode("");
                    setNewPassword("");
                    setResetError("");
                    setResetMessage("");
                  }}
                  className="w-full text-xs text-slate-500 hover:text-blue-600"
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}