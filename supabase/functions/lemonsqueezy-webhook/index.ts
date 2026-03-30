// LemonSqueezy Webhook Handler
// Receives events from LemonSqueezy and updates subscription status in the database.
// This is the ONLY trusted way to change subscription_status to 'pro'.
//
// Deploy: supabase functions deploy lemonsqueezy-webhook --no-verify-jwt
// Required secrets:
//   - LEMONSQUEEZY_WEBHOOK_SECRET (signing secret from LS dashboard)
//   - SUPABASE_URL (auto-provided)
//   - SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!

/** Verify the X-Signature header using HMAC-SHA256 */
async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hexHash = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hexHash === signature
}

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('x-signature')
  if (!signature) {
    return new Response('Missing x-signature header', { status: 400 })
  }

  const body = await req.text()

  // Verify webhook signature — reject tampered/forged events
  const valid = await verifySignature(body, signature)
  if (!valid) {
    console.error('⚠️ Webhook signature verification failed')
    return new Response('Invalid signature', { status: 400 })
  }

  // Use service_role key — bypasses RLS (trusted server context only)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let payload: any
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const eventName = payload.meta?.event_name
  const customData = payload.meta?.custom_data
  const userId = customData?.supabase_user_id
  const attrs = payload.data?.attributes

  console.log(`📩 Received LemonSqueezy event: ${eventName}`)

  try {
    switch (eventName) {
      // ── Subscription created → user just paid ──
      case 'subscription_created': {
        if (!userId) {
          console.warn('subscription_created: missing supabase_user_id in custom_data')
          break
        }

        const lsCustomerId = String(attrs.customer_id)
        const lsSubscriptionId = String(payload.data.id)
        const isActive = attrs.status === 'active' || attrs.status === 'on_trial'

        const { error } = await supabase.from('profiles').update({
          subscription_status: isActive ? 'pro' : 'free',
          stripe_customer_id: `ls_${lsCustomerId}_${lsSubscriptionId}`,  // reuse column for LS IDs
        }).eq('id', userId)

        if (error) console.error('Failed to update profile:', error)
        else console.log(`✅ User ${userId} upgraded to Pro via LemonSqueezy (sub: ${lsSubscriptionId})`)
        break
      }

      // ── Subscription updated (renewal, plan change) ──
      case 'subscription_updated': {
        const lsCustomerId = String(attrs.customer_id)
        const isActive = attrs.status === 'active' || attrs.status === 'on_trial'
        const newStatus = isActive ? 'pro' : 'free'

        // Try to find user by custom_data first, fall back to customer_id match
        if (userId) {
          const { error } = await supabase.from('profiles').update({
            subscription_status: newStatus,
          }).eq('id', userId)
          if (error) console.error('Failed to update (by userId):', error)
          else console.log(`✅ User ${userId} → ${newStatus}`)
        } else {
          // Find by stored customer ID pattern
          const { error } = await supabase.from('profiles').update({
            subscription_status: newStatus,
          }).like('stripe_customer_id', `ls_${lsCustomerId}_%`)
          if (error) console.error('Failed to update (by customerId):', error)
          else console.log(`✅ Customer ${lsCustomerId} → ${newStatus}`)
        }
        break
      }

      // ── Subscription cancelled ──
      case 'subscription_cancelled': {
        const lsCustomerId = String(attrs.customer_id)

        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'free',
          }).eq('id', userId)
        } else {
          await supabase.from('profiles').update({
            subscription_status: 'free',
          }).like('stripe_customer_id', `ls_${lsCustomerId}_%`)
        }
        console.log(`⚠️ Subscription cancelled for customer ${lsCustomerId}`)
        break
      }

      // ── Payment successful (renewal) ──
      case 'subscription_payment_success': {
        // Ensure status is pro on successful payment
        const lsCustomerId = String(attrs.customer_id)
        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'pro',
          }).eq('id', userId)
        } else {
          await supabase.from('profiles').update({
            subscription_status: 'pro',
          }).like('stripe_customer_id', `ls_${lsCustomerId}_%`)
        }
        console.log(`✅ Payment success for customer ${lsCustomerId}`)
        break
      }

      // ── Payment failed ──
      case 'subscription_payment_failed': {
        const lsCustomerId = String(attrs.customer_id)
        console.warn(`⚠️ Payment failed for customer ${lsCustomerId}`)
        // Don't immediately downgrade — LS will retry. 
        // They'll send subscription_cancelled if all retries fail.
        break
      }

      default:
        console.log(`Unhandled event type: ${eventName}`)
    }
  } catch (err) {
    console.error('Error processing webhook event:', err)
    // Still return 200 to prevent LemonSqueezy from retrying
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
