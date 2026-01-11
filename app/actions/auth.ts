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

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
        discord_username: formData.get('discord') as string,
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
  // Password reset emails include a code parameter - we redirect through callback to handle it
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery&next=/reset-password`,
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
