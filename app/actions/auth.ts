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
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
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
