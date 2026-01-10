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

  // Update user metadata (for full_name)
  const { error: updateMetadataError } = await supabase.auth.updateUser({
    data: {
      full_name: data.name,
      discord_username: data.discordUsername,
    },
  })

  if (updateMetadataError) {
    return { error: updateMetadataError.message }
  }

  // Update or insert discord_username in user_profiles table
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      discord_username: data.discordUsername || null,
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

  // Update email - Supabase will send a confirmation email
  const { error: updateError } = await supabase.auth.updateUser({
    email: data.newEmail,
  })

  if (updateError) {
    return { error: updateError.message }
  }

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
