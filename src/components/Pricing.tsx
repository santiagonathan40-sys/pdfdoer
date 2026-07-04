import { Crown, CheckCircle, Shield, Zap } from "lucide-react";
import PayPalHostedButton from "./PayPalHostedButton";

const PAYPAL_MONTHLY_HOSTED_BUTTON_ID = "Y53YH49V9RKF6";
const PAYPAL_YEARLY_HOSTED_BUTTON_ID = "88HQPD6QU4FAJ";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Upgrade Your PDF Workflow
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Subscribe to Pro to get more PDF actions, premium tools, OCR support, and fewer limits.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-100/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                <Zap className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Free</h2>
              <p className="mt-2 text-sm text-slate-600">
                Best for quick PDF tasks and testing the app.
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">$0</span>
                <span className="text-slate-500"> / forever</span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <Feature text="Limited free PDF actions" />
              <Feature text="Access to basic tools" />
              <Feature text="Great for testing PDFDoer" />
              <Feature text="Upgrade anytime" />
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-4 text-center text-sm text-slate-600">
              You are automatically on the Free plan after signup.
            </div>
          </div>

          <div className="relative rounded-3xl border border-blue-200 bg-slate-100/80 p-6 shadow-sm backdrop-blur">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Monthly
            </div>

            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Crown className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Pro Monthly</h2>

              <p className="mt-2 text-sm text-slate-600">
                Recurring monthly subscription for active PDFDoer users.
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">$2</span>
                <span className="text-slate-500"> / month</span>
              </div>

              <p className="mt-2 text-sm font-medium text-blue-700">
                Billed monthly through PayPal.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <Feature text="More PDF actions" />
              <Feature text="Premium tools access" />
              <Feature text="OCR and advanced tools support" />
              <Feature text="Recurring monthly Pro access" />
            </div>

            <div className="mt-8 rounded-2xl bg-white p-4 text-slate-900">
              <PayPalHostedButton
                hostedButtonId={PAYPAL_MONTHLY_HOSTED_BUTTON_ID}
                label="Subscribe Monthly"
                buttonSize="large"
              />
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Complete your subscription securely through PayPal.
            </p>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-slate-100/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <Shield className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Pro Yearly</h2>

              <p className="mt-2 text-sm text-slate-600">
                Recurring yearly subscription with the best value.
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold text-slate-900">$7</span>
                <span className="text-slate-500"> / year</span>
              </div>

              <p className="mt-2 text-sm font-medium text-purple-700">
                Billed yearly through PayPal.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <Feature text="Everything in Pro Monthly" />
              <Feature text="Lower yearly price" />
              <Feature text="Great for long-term use" />
              <Feature text="Recurring yearly Pro access" />
            </div>

            <div className="mt-8 rounded-2xl bg-white p-4 text-slate-900">
              <PayPalHostedButton
                hostedButtonId={PAYPAL_YEARLY_HOSTED_BUTTON_ID}
                label="Subscribe Yearly"
                buttonSize="large"
              />
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Complete your subscription securely through PayPal.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-100/80 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Secure PayPal subscription</p>
          <p className="mt-1 text-slate-600">
            Choose monthly or yearly Pro access and complete your subscription through PayPal.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
      <span>{text}</span>
    </div>
  );
}