import { useState, useRef, useEffect } from 'react'
import { X, CreditCard, Lock, Smartphone, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { api } from '../../api/client'
import toast from 'react-hot-toast'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedPlan: string) => void
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<'card' | 'upi'>('card')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)
  const [upiId, setUpiId] = useState('')
  
  // Processing & Success State
  const [status, setStatus] = useState<'idle' | 'connecting' | 'authorizing' | 'success'>('idle')
  const [confetti, setConfetti] = useState<boolean>(false)

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 16) value = value.slice(0, 16)
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value
    setCardNumber(formatted)
  }

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 4) value = value.slice(0, 4)
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`
    }
    setCardExpiry(value)
  }

  // Format CVV (XXX or XXXX)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 4) value = value.slice(0, 4)
    setCardCvv(value)
  }

  // Form Submit
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (activeTab === 'card') {
      if (cardNumber.length < 19) {
        toast.error('Please enter a valid 16-digit card number')
        return
      }
      if (cardExpiry.length < 5) {
        toast.error('Please enter card expiry in MM/YY format')
        return
      }
      if (cardCvv.length < 3) {
        toast.error('Please enter CVV')
        return
      }
      if (!cardName.trim()) {
        toast.error("Please enter Cardholder's name")
        return
      }
    } else {
      if (!upiId.includes('@') || upiId.length < 5) {
        toast.error('Please enter a valid UPI ID (e.g. user@okhdfc)')
        return
      }
    }

    try {
      // Step 1: Connecting
      setStatus('connecting')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      // Step 2: Authorizing
      setStatus('authorizing')
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // API call to backend
      const payload = {
        payment_method: activeTab,
        plan: 'growth',
        card_number: activeTab === 'card' ? cardNumber : undefined,
        upi_id: activeTab === 'upi' ? upiId : undefined,
      }
      
      const { data } = await api.post('/hr/subscribe', payload)
      
      // Step 3: Success
      setStatus('success')
      setConfetti(true)
      
      // Trigger callback to update state
      if (data?.subscription_plan) {
        onSuccess(data.subscription_plan)
      }
      
      toast.success('Subscription upgraded successfully!')

      // Auto close after showing success screen
      setTimeout(() => {
        setStatus('idle')
        setConfetti(false)
        onClose()
      }, 3000)

    } catch (error: any) {
      setStatus('idle')
      toast.error(error?.response?.data?.detail || 'Payment transaction failed. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/50 bg-white/95 shadow-2xl dark:border-slate-800/50 dark:bg-slate-900/95 md:max-w-2xl">
        
        {/* Confetti Animation Elements */}
        {confetti && (
          <div className="absolute inset-0 pointer-events-none z-50">
            {Array.from({ length: 40 }).map((_, i) => {
              const left = Math.random() * 100
              const delay = Math.random() * 2
              const size = Math.random() * 8 + 4
              const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6']
              const color = colors[Math.floor(Math.random() * colors.length)]
              return (
                <div
                  key={i}
                  className="absolute animate-bounce rounded-full opacity-85"
                  style={{
                    left: `${left}%`,
                    top: `-10px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    animation: `fall 3s linear infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/60 p-6 dark:border-slate-800/60">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Upgrade Subscription <Sparkles className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unlock PratibhaAI Growth Plan • <strong>₹2,999</strong>/month
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={status !== 'idle'}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          {status === 'idle' ? (
            <form onSubmit={handlePay} className="space-y-6">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60">
                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                    activeTab === 'card'
                      ? 'bg-white text-slate-900 shadow-md dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                    activeTab === 'upi'
                      ? 'bg-white text-slate-900 shadow-md dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  UPI Payment
                </button>
              </div>

              {/* CARD PAYMENT TAB */}
              {activeTab === 'card' && (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  
                  {/* Virtual Card Preview (3D Perspective Flip) */}
                  <div className="flex justify-center py-4">
                    <div className="relative h-44 w-72 [perspective:1000px]">
                      <div
                        className={`relative h-full w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white shadow-xl transition-all duration-700 [transform-style:preserve-3d] ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        {/* CARD FRONT */}
                        <div className="absolute inset-0 flex flex-col justify-between p-5 [backface-visibility:hidden]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold tracking-wider">PratibhaAI</span>
                            {/* Chip */}
                            <div className="h-7 w-9 rounded-md bg-amber-400/80 shadow-inner" />
                          </div>
                          
                          <div>
                            {/* Card Number */}
                            <div className="text-lg font-mono tracking-widest text-slate-100 min-h-[28px]">
                              {cardNumber || '•••• •••• •••• ••••'}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-slate-300">Card Holder</span>
                              <span className="block font-mono text-xs uppercase tracking-wider min-h-[16px] max-w-[150px] truncate">
                                {cardName || 'YOUR NAME'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[8px] uppercase tracking-wider text-slate-300">Expires</span>
                              <span className="block font-mono text-xs min-h-[16px]">
                                {cardExpiry || 'MM/YY'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* CARD BACK */}
                        <div className="absolute inset-0 flex flex-col justify-between py-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="h-9 w-full bg-slate-950" />
                          <div className="px-5">
                            <span className="block text-[8px] uppercase tracking-wider text-slate-300 mb-1">Signature / CVV</span>
                            <div className="flex items-center justify-between rounded bg-white px-2.5 py-1 text-slate-800 font-mono text-xs">
                              <div className="h-4 w-28 bg-slate-200/80 stripe-pattern" />
                              <span className="font-bold tracking-wider">{cardCvv || '•••'}</span>
                            </div>
                          </div>
                          <div className="px-5 text-right">
                            <span className="text-[10px] font-bold text-teal-300 italic">SECURE PAY</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Form Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="4532 7182 9301 8421"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => setIsFlipped(false)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Shivam Dubey"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        onFocus={() => setIsFlipped(false)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          Expiration (MM/YY)
                        </label>
                        <input
                          type="text"
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          onFocus={() => setIsFlipped(false)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                          CVV
                        </label>
                        <input
                          type="password"
                          placeholder="***"
                          value={cardCvv}
                          onChange={handleCvvChange}
                          onFocus={() => setIsFlipped(true)}
                          onBlur={() => setIsFlipped(false)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UPI PAYMENT TAB */}
              {activeTab === 'upi' && (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  
                  {/* Mock QR Code Display */}
                  <div className="flex flex-col items-center justify-center p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 shadow-inner">
                    <div className="relative p-2 bg-white rounded-lg border-2 border-emerald-500 animate-pulse-subtle">
                      {/* Dynamic Mock SVG QR Code */}
                      <svg width="140" height="140" viewBox="0 0 100 100" className="text-slate-800">
                        <path d="M5,5 h30 v30 h-30 z M10,10 h20 v20 h-20 z M15,15 h10 v10 h-10 z" fill="currentColor"/>
                        <path d="M65,5 h30 v30 h-30 z M70,10 h20 v20 h-20 z M75,15 h10 v10 h-10 z" fill="currentColor"/>
                        <path d="M5,65 h30 v30 h-30 z M10,70 h20 v20 h-20 z M75,70 h20 v20 h-20 z" fill="currentColor"/>
                        {/* Abstract QR Matrix patterns */}
                        <path d="M40,5 h10 v10 h-10 z M55,5 h5 v15 h-5 z M45,20 h10 v5 h-10 z M40,30 h5 v10 h-5 z M50,30 h10 v5 h-10 z M60,40 h15 v5 h-15 z M80,40 h10 v15 h-10 z" fill="currentColor"/>
                        <path d="M5,40 h10 v5 h-10 z M20,40 h15 v5 h-15 z M15,50 h10 v10 h-10 z M40,50 h10 v15 h-10 z M55,50 h10 v5 h-10 z M80,60 h5 v10 h-5 z M90,65 h5 v15 h-5 z" fill="currentColor"/>
                        <path d="M40,70 h15 v5 h-15 z M45,80 h10 v15 h-10 z M60,80 h15 v5 h-15 z M80,80 h5 v10 h-5 z" fill="currentColor"/>
                      </svg>
                      {/* Floating logo badge */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded bg-emerald-500 px-1 py-0.5 text-[8px] font-bold text-white shadow">
                          PAY
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 text-center">
                      Scan using Google Pay, PhonePe, Paytm or BHIM
                    </span>
                  </div>

                  {/* UPI text box */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Pay using UPI ID
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Enter your UPI ID (VPA) and click Pay. You will receive a simulated request to authorize.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                        UPI ID (VPA)
                      </label>
                      <input
                        type="text"
                        placeholder="shivam@okaxis"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Secure Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs">Secure 256-bit SSL encrypted connection</span>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Pay ₹2,999 Now
                </button>
              </div>

            </form>
          ) : (
            /* PROCESSING & SUCCESS VIEWS */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              
              {status === 'connecting' && (
                <div className="space-y-4 animate-pulse">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-16 w-16 text-emerald-500 animate-spin" />
                    <CreditCard className="absolute h-6 w-6 text-slate-700 dark:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Connecting to Payment Gateway...
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Please do not refresh the page or click back button. Securing connection.
                  </p>
                </div>
              )}

              {status === 'authorizing' && (
                <div className="space-y-4 animate-pulse">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-16 w-16 text-emerald-500 animate-spin" />
                    <Lock className="absolute h-6 w-6 text-slate-700 dark:text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    Authorizing Transaction...
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Waiting for validation response from the secure payment processor.
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-5 animate-scale-up">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 shadow-xl shadow-emerald-500/20">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      Payment Successful!
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                      Transaction ID: <span className="font-mono text-slate-800 dark:text-slate-100 font-semibold">TXN-{(Math.random() * 100000000).toFixed(0)}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Welcome to <strong>PratibhaAI Growth Plan</strong>
                    </p>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                    Setting up your premium features dashboard...
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Fallback styling for fall animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(450px) rotate(360deg);
            opacity: 0;
          }
        }
        .stripe-pattern {
          background: repeating-linear-gradient(
            45deg,
            #cbd5e1,
            #cbd5e1 4px,
            #94a3b8 4px,
            #94a3b8 8px
          );
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.98); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s infinite ease-in-out;
        }
        @keyframes scale-up {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  )
}
