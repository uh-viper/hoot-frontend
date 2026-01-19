'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { initializeUserData } from '@/lib/api/user-initialization'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  // Get the origin for redirect URL
  let origin = process.env.NEXT_PUBLIC_SITE_URL
  if (!origin && process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`
  }
  if (!origin) {
    origin = 'http://localhost:3000'
  }

  // Get and normalize referral code if provided (case-insensitive)
  const rawReferralCode = formData.get('referral') as string | null
  let referralCode: string | null = null
  let freeCreditsToGrant = 0
  
  if (rawReferralCode && rawReferralCode.trim()) {
    // Normalize: uppercase, alphanumeric only (case-insensitive input)
    const normalizedInput = rawReferralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    
    // Validate referral code exists and is active, get free_credits value
    // Codes are stored in uppercase in DB, so we can query directly
    if (normalizedInput) {
      const { data: validCode } = await supabase
        .from('referral_codes')
        .select('id, code, free_credits')
        .eq('code', normalizedInput) // Direct query since codes are stored uppercase
        .eq('is_active', true)
        .single()
      
      if (!validCode) {
        return { error: 'Invalid referral code. Please check and try again.' }
      }
      // Use the exact code from database
      referralCode = validCode.code
      // Get free credits amount (validate it's a valid number and within limits)
      freeCreditsToGrant = Math.max(0, Math.min(1000000, Math.floor(validCode.free_credits || 0)))
    }
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
        discord_username: formData.get('discord') as string,
        referral_code: referralCode,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  // Initialize user data (credits and stats)
  // The trigger should handle this, but we'll ensure it here too
  if (authData.user) {
    // Wait a moment for the trigger to potentially fire
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Ensure user data is initialized (will create if trigger didn't work)
    await initializeUserData(authData.user.id)
    
    // Update user profile with referral code if provided
    if (referralCode) {
      await supabase
        .from('user_profiles')
        .update({ referral_code: referralCode })
        .eq('user_id', authData.user.id)
    }
    
    // Grant free credits if referral code has free_credits > 0
    // Security: Only grant during signup, validate amount is within limits (0-1,000,000)
    if (freeCreditsToGrant > 0) {
      // Get current credits
      const { data: currentCredits } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', authData.user.id)
        .single()
      
      const currentBalance = currentCredits?.credits || 0
      const newBalance = currentBalance + freeCreditsToGrant
      
      // Update credits (secure: only during signup, validated amount)
      const { error: creditsError } = await supabase
        .from('user_credits')
        .update({ credits: newBalance })
        .eq('user_id', authData.user.id)
      
      if (creditsError) {
        console.error('Error granting free credits from referral code:', creditsError)
        // Don't fail signup if credits grant fails, just log it
      } else {
        console.log(`[REFERRAL] Granted ${freeCreditsToGrant} free credits to user ${authData.user.id} from referral code ${referralCode}`)
      }
    }

    // Send welcome notification if one exists
    try {
      const { data: welcomeNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('is_welcome_notification', true)
        .eq('is_active', true)
        .single()

      if (welcomeNotification) {
        await supabase
          .from('user_notifications')
          .insert({
            user_id: authData.user.id,
            notification_id: welcomeNotification.id,
          })
        console.log(`[NOTIFICATION] Sent welcome notification to user ${authData.user.id}`)
      }
    } catch (notificationError) {
      // Don't fail signup if notification fails, just log it
      console.error('Error sending welcome notification:', notificationError)
    }
  }

  // Return success instead of redirecting
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    let errorMessage = error.message;
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please confirm your email before signing in.';
    } else if (error.message.includes('Too many requests')) {
      errorMessage = 'Too many login attempts. Please try again later.';
    }
    
    return { error: errorMessage };
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function verifyEmail(token_hash: string, type: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  // Get the origin for redirect URL
  let origin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!origin && process.env.VERCEL_URL) {
    origin = `https://${process.env.VERCEL_URL}`
  }
  if (!origin) {
    origin = 'http://localhost:3000'
  }

  // Always return success for security (don't reveal if email exists)
  // Supabase will send email if account exists, but won't reveal if it doesn't
  // redirectTo should point directly to reset-password page
  // Supabase's verify endpoint will redirect here with code parameter
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always return success message (security best practice)
  // This prevents email enumeration attacks
  return { success: true }
}

export async function verifyPasswordResetToken(formData: FormData) {
  const supabase = await createClient()
  const tokenHash = formData.get('token_hash') as string
  const type = formData.get('type') as string

  // Verify the OTP token - this creates a session if valid
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as any,
  })

  if (error) {
    return { error: error.message || 'Invalid or expired reset token' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePasswordFromReset(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  // After verifyOtp, the user should have a session
  // Now we can update the password
  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message || 'Failed to update password. Please try again or request a new reset link.' }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
