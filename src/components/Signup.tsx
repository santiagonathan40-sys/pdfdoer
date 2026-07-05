import React, { useState } from "react";
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  User as UserIcon,
  Check,
  KeyRound,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { User } from "../types";
import {
  registerUser,
  verifyEmailCode,
  resendVerificationCode,
  googleLoginUser,
} from "../services/authApi";

interface SignupProps {
  onNavigate: (page: string) => void;
  onLogin: (user: User) => void;
}

type SignupStep = "form" | "verify";

export default function Signup({ onNavigate, onLogin }: SignupProps) {
  const [step, setStep] = useState<SignupStep>("form");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [verificationCode, setVerificationCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const completeLogin = (user: any) => {
    onLogin({
      email: user.email,
      tier: user.tier,
      createdAt: user.createdAt || new Date().toLocaleDateString(),
    });

    onNavigate("home");
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setError("Google signup failed. Please try again.");
      return;
    }

    if (!agreeTerms) {
      setError("Please agree to the Terms and Privacy Policy before continuing with Google.");
      return;
    }

    setIsGoogleLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await googleLoginUser({
        credential: credentialResponse.credential,
      });

      if (!result.user) {
        setError("Google signup failed. Please try again.");
        return;
      }

      completeLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google signup failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms and Privacy Policy");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const result = await registerUser({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (!result.user) {
        setError("Unable to create account. Please try again.");
        return;
      }

      setMessage(
        result.message ||
          "Account created. Please check your email for the verification code."
      );

      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email address is missing. Please sign up again.");
      return;
    }

    if (verificationCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setError("");
    setMessage("");

    try {
      const result = await verifyEmailCode({
        email: email.trim(),
        code: verificationCode.trim(),
      });

      if (!result.user) {
        setError("Unable to verify account. Please try again.");
        return;
      }

      completeLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError("Email address is missing. Please sign up again.");
      return;
    }

    setIsResending(true);
    setError("");
    setMessage("");

    try {
      const result = await resendVerificationCode(email.trim());
      setMessage(result.message || "A new verification code has been sent.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to resend verification code."
      );
    } finally {
      setIsResending(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-6 sm:px-8">
        <div className="w-full max-w-md space-y-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-xl shadow-md animate-fade-in">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <KeyRound size={22} />
            </div>

            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
              Verify Your Email
            </span>

            <h2 className="mt-4 text-3xl font-display font-extrabold text-slate-900 tracking-tight">
              Enter verification code
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-slate-700">{email}</span>.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold text-center">
              {message}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleVerifyCode}>
            <div>
              <label
                htmlFor="verification-code"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Verification Code
              </label>

              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                className="block w-full px-4 py-4 border border-slate-200 rounded-lg text-lg tracking-[0.5em] text-center placeholder-slate-300 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying..." : "Verify Account"}
            </button>
          </form>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
              className="text-sm font-semibold text-blue-600 hover:underline disabled:text-slate-400"
            >
              {isResending ? "Sending new code..." : "Resend code"}
            </button>

            <p className="text-xs text-slate-400">
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setVerificationCode("");
                  setError("");
                  setMessage("");
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Go back
              </button>
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Email verification protects PDFDoer accounts</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-6 sm:px-8">
      <div className="w-full max-w-lg space-y-8 bg-white border border-slate-200 p-8 sm:p-10 rounded-xl shadow-md animate-fade-in">
        <div className="text-center">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Create Free Account
          </span>

          <h2 className="mt-4 text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Start Processing PDFs
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create your PDFDoer account with Google or verify your email with a secure code.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold text-center">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google signup failed. Please try again.")}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
            />
          </div>

          {isGoogleLoading && (
            <p className="text-center text-xs text-slate-500">
              Creating account with Google...
            </p>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>

          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400">
              or create account with email
            </span>
          </div>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleSignupSubmit}
          id="signup-form"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="full-name"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Full Name
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon size={16} />
                </div>

                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Alex Smith"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>

                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
              >
                Choose Password
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>

                <input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-500 transition-all bg-slate-50/20"
                  placeholder="Must be 6+ characters"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <Check size={13} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Free Account
                  </h3>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Google signups are verified automatically. Email signups require a 6-digit verification code.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start pt-1">
              <div className="flex items-center h-5">
                <input
                  id="agree-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="ml-3 text-xs">
                <label
                  htmlFor="agree-terms"
                  className="font-medium text-slate-500 cursor-pointer"
                >
                  I agree to PDFDoer&apos;s{" "}
                  <button
                    type="button"
                    onClick={() =>
                      alert("Terms page will be connected before launch.")
                    }
                    className="text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() =>
                      alert("Privacy policy page will be connected before launch.")
                    }
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-[0_4px_6px_-1px_rgba(37,99,235,0.2)] disabled:bg-slate-300 disabled:cursor-not-allowed"
            id="btn-submit-signup"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Creating account...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <span>Create Free Account</span>
                <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Log in instead
            </button>
          </p>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 pt-2 border-t border-slate-100">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Secure account registration for PDFDoer users</span>
        </div>
      </div>
    </div>
  );
}