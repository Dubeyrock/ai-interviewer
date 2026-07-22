import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, CheckCircle2, ShieldAlert, Sparkles, RefreshCw, XCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'
import PaymentModal from '../components/billing/PaymentModal'
import toast from 'react-hot-toast'

interface BillingInfo {
  subscription_plan: string
  subscription_status: string
  subscription_ends_at: string | null
  company_name?: string
}

interface Invoice {
  date: string
  plan: string
  amount: string
  txnId: string
  status: 'Paid' | 'Failed' | 'Pending'
}

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    subscription_plan: 'starter',
    subscription_status: 'active',
    subscription_ends_at: null,
  })
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  // Fetch billing details from API
  const fetchBilling = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/hr/billing')
      setBillingInfo(data)
    } catch (error: any) {
      toast.error('Failed to load billing details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBilling()
  }, [])

  // Auto-open modal if URL contains ?upgrade=growth
  useEffect(() => {
    if (!loading && searchParams.get('upgrade') === 'growth' && billingInfo.subscription_plan === 'starter') {
      setIsPaymentOpen(true)
      // Clean query parameter
      searchParams.delete('upgrade')
      setSearchParams(searchParams)
    }
  }, [loading, billingInfo.subscription_plan, searchParams])

  const handleSubscriptionSuccess = (updatedPlan: string) => {
    setBillingInfo((prev) => ({
      ...prev,
      subscription_plan: updatedPlan,
      subscription_status: 'active',
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  }

  const handleCancelSubscription = async () => {
    const ok = window.confirm('Are you sure you want to cancel your premium subscription? Your plan will downgrade to Starter immediately.')
    if (!ok) return

    try {
      setCancelling(true)
      const { data } = await api.post('/hr/cancel-subscription')
      setBillingInfo({
        subscription_plan: data.subscription_plan,
        subscription_status: data.subscription_status,
        subscription_ends_at: null,
      })
      toast.success('Subscription cancelled successfully')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to cancel subscription')
    } finally {
      setCancelling(false)
    }
  }

  // Generate Mock Invoices
  const getMockInvoices = (): Invoice[] => {
    const invoices: Invoice[] = []
    
    // Growth plan invoice if active
    if (billingInfo.subscription_plan === 'growth') {
      invoices.push({
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        plan: 'Growth Plan (Monthly)',
        amount: '₹2,999.00',
        txnId: 'TXN-984210735',
        status: 'Paid',
      })
    }

    // Standard free starter invoice
    invoices.push({
      date: '10 May 2026',
      plan: 'Starter Plan (Registration)',
      amount: '₹0.00',
      txnId: 'TXN-INIT749321',
      status: 'Paid',
    })

    return invoices
  }

  const featuresList = [
    '100 interviews/month',
    'Emotion AI analysis (realtime)',
    'Priority email & chat support',
    'Customized job roles setup',
    'Full candidate video recording log',
    'Detailed PDF scoring reports',
    'HR Dashboard analytics metrics',
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Billing & Subscriptions
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your plan, check invoice details, and upgrade subscription.
            </p>
          </div>
        </div>
        <button
          onClick={fetchBilling}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-emerald-500" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* LEFT: Current subscription & available plans */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Status summary */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Active Subscription Summary
                {billingInfo.company_name && (
                  <span className="ml-2 align-middle text-xs font-medium text-slate-400">
                    ({billingInfo.company_name})
                  </span>
                )}
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-5 border border-slate-200/50 dark:border-slate-800/40">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                    Current Plan
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold capitalize text-slate-900 dark:text-white">
                      {billingInfo.subscription_plan === 'growth' ? 'Growth Plan (Pro)' : 'Starter Plan (Free)'}
                    </span>
                    {billingInfo.subscription_plan === 'growth' && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 fill-emerald-500/20" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {billingInfo.subscription_plan === 'growth'
                      ? 'Fully unlocked access to autonomous interviews and emotion analytics.'
                      : 'Basic access to candidate screening and test scoring.'}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-5 border border-slate-200/50 dark:border-slate-800/40">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                    Renewal & Expiration
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {billingInfo.subscription_ends_at
                      ? new Date(billingInfo.subscription_ends_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Lifetime Free'}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">
                    {billingInfo.subscription_ends_at
                      ? 'Auto renewal will occur on the renewal date via registered payment profile.'
                      : 'Upgrade to premium anytime to unlock higher features capacity.'}
                  </p>
                </div>
              </div>

              {/* Upgrade or cancel action */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                {billingInfo.subscription_plan === 'starter' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        You are running on the free tier. Unlock complete dashboard features.
                      </span>
                    </div>
                    <button
                      onClick={() => setIsPaymentOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/10 hover:shadow-lg transition hover:scale-[1.02]"
                    >
                      Upgrade to Growth
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        You have complete access to the premium Growth tier benefits.
                      </span>
                    </div>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="rounded-xl border border-red-200/50 hover:bg-red-50 hover:border-red-300 dark:border-red-900/30 dark:hover:bg-red-950/20 px-6 py-2.5 text-sm font-bold text-red-600 transition"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                Billing & Invoice History
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold pb-3">
                      <th className="pb-3 pr-4">Invoice Date</th>
                      <th className="pb-3 px-4">Plan Name</th>
                      <th className="pb-3 px-4">Amount Paid</th>
                      <th className="pb-3 px-4">Transaction ID</th>
                      <th className="pb-3 pl-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMockInvoices().map((inv, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 last:border-0"
                      >
                        <td className="py-4 pr-4 font-medium text-slate-900 dark:text-white">{inv.date}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-300">{inv.plan}</td>
                        <td className="py-4 px-4 font-mono font-bold text-slate-950 dark:text-white">{inv.amount}</td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-400">{inv.txnId}</td>
                        <td className="py-4 pl-4 text-right">
                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT: Plan Details Sidebar */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-900 to-indigo-950 p-6 text-white shadow-xl relative overflow-hidden">
              {/* Background gradient sphere */}
              <div className="absolute top-0 right-0 -mt-8 -mr-8 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />

              <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4">
                Growth Plan Features
              </span>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">₹2,999</span>
                  <span className="text-sm text-indigo-200">/ month</span>
                </div>
                <p className="text-xs text-indigo-200/70 mt-1">
                  Complete kit for scaling teams. Fully automated.
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {featuresList.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-indigo-100">{feature}</span>
                  </li>
                ))}
              </ul>

              {billingInfo.subscription_plan === 'starter' && (
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-indigo-900 transition shadow-lg hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Upgrade Now
                  <ArrowRight className="h-4 w-4 text-indigo-900" />
                </button>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Need Custom Limits?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                If you have custom requirements (unlimited interviews, white-labeled branding, on-premise servers, SLA guarantees), feel free to look at our Enterprise solution.
              </p>
              <a
                href="/book-demo"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                Contact Sales Team <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

        </div>
      )}

      {/* Payment Modal checkout */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handleSubscriptionSuccess}
      />

    </div>
  )
}
