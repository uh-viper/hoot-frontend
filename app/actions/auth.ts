'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  const { error, data: signUpData } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  // Always redirect to check-email page, even if email confirmation is disabled
  revalidatePath('/', 'layout')
  redirect('/auth/check-email')
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
