import React, { useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import { redeemVoucher, type SubscriptionInfo, type SubscriptionStatus } from '../lib/subscription'
import { supabase } from '../lib/supabase'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  subscriptionInfo: SubscriptionInfo | null
  onSubscriptionChange: () => void  // callback to refresh subscription info
  reason?: 'limit' | 'trial_expired' | 'general' | 'feature' | 'usage_expired'
}

export default function UpgradeModal({ isOpen, onClose, subscriptionInfo, onSubscriptionChange, reason = 'general' }: UpgradeModalProps) {
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [tab, setTab] = useState<'upgrade' | 'voucher'>('upgrade')
  const { isDark } = useTheme()

  if (!isOpen) return null

  const isHardLock = reason === 'usage_expired'

  const info = subscriptionInfo
  const statusLabel = info?.status === 'pro' ? 'Pro' : 'Free'

  const headingText = reason === 'limit'
    ? 'Project Limit Reached'
    : reason === 'feature'
    ? 'Pro Feature'
    : reason === 'usage_expired'
    ? 'Free Usage Expired'
    : 'Upgrade to Pro'

  const descriptionText = reason === 'limit'
    ? 'Free accounts are limited to 1 project. Upgrade to Pro for unlimited projects, or enter a voucher code.'
    : reason === 'feature'
    ? 'please subscribe to use our full feature'
    : reason === 'usage_expired'
    ? 'Your free usage time has ended. Subscribe to Pro to continue using StageSim.'
    : 'Unlock unlimited projects, PDF export, and priority support.'

  async function handleRedeemVoucher() {
    if (!voucherCode.trim()) return
    setVoucherLoading(true)
    setVoucherMessage(null)
    try {
      const result = await redeemVoucher(voucherCode)
      if (result.status === 'SUCCESS') {
        setVoucherMessage({ text: result.message, type: 'success' })
        onSubscriptionChange()
        setTimeout(() => onClose(), 1500)
      } else {
        setVoucherMessage({ text: result.message, type: 'error' })
      }
    } catch (err: any) {
      setVoucherMessage({ text: err.message || 'Something went wrong', type: 'error' })
    } finally {
      setVoucherLoading(false)
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: selectedPlan },
      })
      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
      } else {
        setVoucherMessage({ text: 'Failed to create checkout session', type: 'error' })
      }
    } catch (err: any) {
      setVoucherMessage({ text: err.message || 'Failed to start checkout', type: 'error' })
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Styles
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 10001,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
  }

  const modalStyle: React.CSSProperties = {
    background: isDark ? '#1e293b' : '#fff',
    borderRadius: 16, width: 460, maxWidth: '90vw',
    boxShadow: isDark
      ? '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 25px 80px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  }

  const accentGradient = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
  const textColor = isDark ? '#e2e8f0' : '#1e293b'
  const mutedColor = isDark ? '#94a3b8' : '#64748b'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc'
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db'

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && !isHardLock) onClose() }}>
      <div style={modalStyle}>
        {/* Header gradient */}
        <div style={{
          background: accentGradient, padding: '28px 28px 20px',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {headingText}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
                {descriptionText}
              </p>
            </div>
            {!isHardLock && (
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
              color: '#fff', width: 32, height: 32, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >✕</button>
            )}
          </div>

          {/* Current status badge */}
          {info && (
            <div style={{
              marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)', borderRadius: 20,
              padding: '5px 14px', fontSize: 12, fontWeight: 500,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: info.status === 'pro' ? '#34d399' : '#94a3b8',
              }} />
              {statusLabel} Plan
              {info.status !== 'pro' && ` · ${info.project_count}/1 project${info.project_count !== 1 ? 's' : ''} used`}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${borderColor}` }}>
          {(['upgrade', 'voucher'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setVoucherMessage(null) }}
              style={{
                flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
                color: tab === t ? (isDark ? '#a5b4fc' : '#6366f1') : mutedColor,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {t === 'upgrade' ? '💳 Upgrade' : '🎟️ Voucher Code'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px' }}>
          {tab === 'upgrade' && (
            <div>
              {/* Pricing cards */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {/* Monthly */}
                <div
                  onClick={() => setSelectedPlan('monthly')}
                  style={{
                    flex: 1, borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                    cursor: 'pointer',
                    border: selectedPlan === 'monthly' ? '2px solid #6366f1' : `1px solid ${borderColor}`,
                    background: selectedPlan === 'monthly' ? (isDark ? 'rgba(99,102,241,0.08)' : '#f5f3ff') : inputBg,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: selectedPlan === 'monthly' ? '#6366f1' : mutedColor, marginBottom: 8 }}>Monthly</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: textColor }}>$8<span style={{ fontSize: 14, fontWeight: 400, color: mutedColor }}>/mo</span></div>
                </div>
                {/* Yearly */}
                <div
                  onClick={() => setSelectedPlan('yearly')}
                  style={{
                    flex: 1, borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                    cursor: 'pointer',
                    border: selectedPlan === 'yearly' ? '2px solid #6366f1' : `1px solid ${borderColor}`,
                    background: selectedPlan === 'yearly' ? (isDark ? 'rgba(99,102,241,0.08)' : '#f5f3ff') : inputBg,
                    position: 'relative',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: accentGradient, color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '2px 10px', borderRadius: 10, letterSpacing: '0.05em',
                  }}>SAVE 25%</div>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: selectedPlan === 'yearly' ? '#6366f1' : mutedColor, marginBottom: 8 }}>Yearly</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: textColor }}>$72<span style={{ fontSize: 14, fontWeight: 400, color: mutedColor }}>/yr</span></div>
                </div>
              </div>

              {/* Features */}
              <div style={{ marginBottom: 20 }}>
                {[
                  'Unlimited projects',
                  'PDF export for rehearsal packets',
                  'Priority support',
                  'All future Pro features',
                ].map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, color: textColor }}>
                    <span style={{ color: '#34d399', fontSize: 15 }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <button
                disabled={checkoutLoading}
                style={{
                  width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
                  border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff',
                  background: accentGradient,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  opacity: checkoutLoading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!checkoutLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.45)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)' }}
                onClick={handleCheckout}
              >
                {checkoutLoading ? 'Redirecting to checkout…' : `Subscribe to Pro — $${selectedPlan === 'yearly' ? '72/yr' : '8/mo'}`}
              </button>
            </div>
          )}

          {tab === 'voucher' && (
            <div>
              <p style={{ fontSize: 13, color: mutedColor, margin: '0 0 16px', lineHeight: 1.5 }}>
                If you have a voucher code from your school, theatre, or community program, enter it below for free Pro access.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter voucher code"
                  value={voucherCode}
                  onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherMessage(null) }}
                  onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleRedeemVoucher() }}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 14, fontWeight: 500,
                    border: `1px solid ${inputBorder}`, borderRadius: 10,
                    background: inputBg, color: textColor,
                    outline: 'none', letterSpacing: '0.08em',
                    fontFamily: "'Inter', monospace",
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                  onBlur={e => (e.currentTarget.style.borderColor = inputBorder)}
                />
                <button
                  onClick={handleRedeemVoucher}
                  disabled={voucherLoading || !voucherCode.trim()}
                  style={{
                    padding: '10px 20px', fontSize: 13, fontWeight: 600,
                    border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff',
                    background: accentGradient,
                    opacity: (voucherLoading || !voucherCode.trim()) ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {voucherLoading ? '…' : 'Apply'}
                </button>
              </div>

              {/* Voucher feedback */}
              {voucherMessage && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: voucherMessage.type === 'success'
                    ? (isDark ? 'rgba(52,211,153,0.12)' : '#ecfdf5')
                    : (isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2'),
                  color: voucherMessage.type === 'success'
                    ? (isDark ? '#6ee7b7' : '#059669')
                    : (isDark ? '#fca5a5' : '#dc2626'),
                  border: `1px solid ${voucherMessage.type === 'success'
                    ? (isDark ? 'rgba(52,211,153,0.2)' : '#a7f3d0')
                    : (isDark ? 'rgba(239,68,68,0.2)' : '#fecaca')}`,
                }}>
                  {voucherMessage.type === 'success' ? '✓ ' : '✕ '}{voucherMessage.text}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          padding: '12px 28px 16px', borderTop: `1px solid ${borderColor}`,
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 11, color: mutedColor, lineHeight: 1.5 }}>
            You always own your data. Export scenes as JSON anytime, even on the free plan. No lock-in.
          </p>
        </div>
      </div>
    </div>
  )
}
