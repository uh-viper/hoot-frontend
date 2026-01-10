'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProfileData {
  name: string
  discordUsername: string
}

interface UpdatePasswordData {
  currentPassword: string
  newPassword: string
}

interface UpdateEmailData {
  newEmail: string
}

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: 'Not authenticated' }
  }

  // Get current user email (from auth.users)
  const currentEmail = user.email || ''

  // Update user metadata (full_name and discord_username are stored here)
  const { error: updateMetadataError } = await supabase.auth.updateUser({
    data: {
      full_name: data.name,
      discord_username: data.discordUsername,
    },
  })

  if (updateMetadataError) {
    return { error: updateMetadataError.message }
  }

  // Update or insert profile data in user_profiles table
  // This saves: name, email, and discord_username to the database table
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      full_name: data.name || null,
      discord_username: data.discordUsername || null,
      email: currentEmail, // Keep current email from auth.users
    }, {
      onConflict: 'user_id',
    })

  if (profileError) {
    return { error: profileError.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateEmail(data: UpdateEmailData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: 'Not authenticated' }
  }

  // Update email in auth.users - Supabase will send a confirmation email
  // Email is stored in auth.users.email (not in metadata)
  // The email will NOT change until the user confirms via the confirmation link
  const { error: updateError } = await supabase.auth.updateUser({
    email: data.newEmail,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  // DO NOT update user_profiles table here - wait until email is confirmed
  // The database trigger will sync the email from auth.users to user_profiles
  // once the email is confirmed and auth.users.email is actually updated

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'Email update confirmation sent. Please check your new email inbox.' }
}

export async function updatePassword(data: UpdatePasswordData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: 'Not authenticated' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: data.newPassword,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
