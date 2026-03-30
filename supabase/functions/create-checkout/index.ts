// Create LemonSqueezy Checkout Session
// Called by the frontend when a user clicks "Subscribe to Pro".
// Returns a LemonSqueezy Checkout URL to redirect the user to.
//
// Deploy: supabase functions deploy create-checkout
// Required secrets:
//   - LEMONSQUEEZY_API_KEY (from LS dashboard → Settings → API)
//   - LEMONSQUEEZY_STORE_ID (your store ID)
//   - LEMONSQUEEZY_MONTHLY_VARIANT_ID (variant ID for $8/mo plan)
//   - LEMONSQUEEZY_YEARLY_VARIANT_ID (variant ID for $72/yr plan)
//   - SUPABASE_URL (auto-provided)
//   - SUPABASE_ANON_KEY (auto-provided)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LS_API_KEY = Deno.env.get('LEMONSQUEEZY_API_KEY')!
const STORE_ID = Deno.env.get('LEMONSQUEEZY_STORE_ID')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the user via their Supabase JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { plan = 'monthly' } = await req.json().catch(() => ({}))

    const variantId = plan === 'yearly'
      ? Deno.env.get('LEMONSQUEEZY_YEARLY_VARIANT_ID')!
      : Deno.env.get('LEMONSQUEEZY_MONTHLY_VARIANT_ID')!

    if (!variantId) {
      return new Response(JSON.stringify({ error: 'LemonSqueezy variant not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'http://localhost:3000'

    // Create LemonSqueezy Checkout via API
    // Docs: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
    const lsResponse = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LS_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email || '',
              custom: {
                supabase_user_id: user.id,  // This is how the webhook knows which user paid
              },
            },
            product_options: {
              redirect_url: `${origin}?checkout=success`,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: STORE_ID,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    })

    if (!lsResponse.ok) {
      const errText = await lsResponse.text()
      console.error('LemonSqueezy API error:', errText)
      return new Response(JSON.stringify({ error: 'Failed to create checkout' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lsData = await lsResponse.json()
    const checkoutUrl = lsData.data?.attributes?.url

    if (!checkoutUrl) {
      return new Response(JSON.stringify({ error: 'No checkout URL returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error creating checkout session:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
