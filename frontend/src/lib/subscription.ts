import { supabase } from './supabase'

// ── Types ──

export type SubscriptionStatus = 'free' | 'pro' | 'trial'

export type SubscriptionInfo = {
  status: SubscriptionStatus
  projects_created: number
  project_count: number
  has_voucher: boolean
  voucher_code: string | null
  trial_ends_at: string | null
  can_create_project: boolean
  usage_seconds_used: number
  usage_limit: number
  usage_expired: boolean
}

export type VoucherResult = {
  status: 'SUCCESS' | 'INVALID_CODE' | 'CODE_EXHAUSTED' | 'CODE_EXPIRED' | 'ALREADY_REDEEMED'
  message: string
}

export type TrialResult = {
  status: 'SUCCESS' | 'ALREADY_SUBSCRIBED' | 'TRIAL_USED' | 'ERROR'
  message: string
  trial_ends_at?: string
}

// ── API Functions (all go through server-side RPC) ──

/** Fetch the current user's subscription info from the server */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const { data, error } = await supabase.rpc('get_subscription_info')
  if (error) throw error
  return data as SubscriptionInfo
}

/** Redeem a voucher code (server validates everything) */
export async function redeemVoucher(code: string): Promise<VoucherResult> {
  const { data, error } = await supabase.rpc('redeem_voucher', { p_code: code })
  if (error) throw error
  return data as VoucherResult
}

/** Start a 3-day trial (server validates eligibility) */
export async function startTrial(): Promise<TrialResult> {
  const { data, error } = await supabase.rpc('start_trial')
  if (error) throw error
  return data as TrialResult
}

/** Record usage heartbeat (called every 60s while tab is visible) */
export async function recordUsage(seconds: number = 60): Promise<{ usage_seconds_used: number; usage_limit: number; usage_expired: boolean }> {
  const { data, error } = await supabase.rpc('record_usage', { p_seconds: seconds })
  if (error) throw error
  return data as { usage_seconds_used: number; usage_limit: number; usage_expired: boolean }
}

/** Helper: format trial end date relative to now */
export function formatTrialRemaining(trialEndsAt: string | null): string {
  if (!trialEndsAt) return ''
  const ends = new Date(trialEndsAt)
  const now = new Date()
  const diffMs = ends.getTime() - now.getTime()
  if (diffMs <= 0) return 'Expired'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours >= 24) {
    const days = Math.ceil(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} left`
  }
  return `${hours} hour${hours === 1 ? '' : 's'} left`
}
