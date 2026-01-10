'use server'

import { createClient } from '@/lib/supabase/server'
import { initializeUserData } from '@/lib/api/user-initialization'
import { revalidatePath } from 'next/cache'

// Import initializeUserData only if needed (don't call it unless necessary to avoid circular issues)

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

// Safe error messages - don't expose database details
const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'You must be signed in to update your profile.',
  UPDATE_FAILED: 'Failed to update profile. Please try again.',
  EMAIL_UPDATE_FAILED: 'Failed to send email confirmation. Please try again.',
  PASSWORD_UPDATE_FAILED: 'Failed to update password. Please try again.',
  INVALID_INPUT: 'Invalid input provided.',
}

export async function updateProfile(data: UpdateProfileData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: ERROR_MESSAGES.NOT_AUTHENTICATED }
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
    // Don't expose Supabase error details
    console.error('Error updating user metadata:', updateMetadataError)
    return { error: ERROR_MESSAGES.UPDATE_FAILED }
  }

  // Use RPC function to upsert profile (bypasses RLS with SECURITY DEFINER)
  // This safely creates or updates the profile without RLS issues
  const { error: upsertError } = await supabase.rpc('upsert_user_profile', {
    p_user_id: user.id,
    p_full_name: data.name || null,
    p_email: currentEmail,
    p_discord_username: data.discordUsername || null,
  })

  if (upsertError) {
    // If RPC fails, fallback to initializeUserData
    console.error('Error upserting user profile via RPC:', upsertError)
    await initializeUserData(user.id)
    
    // Try one more time with direct update (profile should exist now)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name: data.name || null,
        discord_username: data.discordUsername || null,
        email: currentEmail,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating user profile after initialization:', updateError)
      return { error: ERROR_MESSAGES.UPDATE_FAILED }
    }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateEmail(data: UpdateEmailData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: ERROR_MESSAGES.NOT_AUTHENTICATED }
  }

  // Validate email format
  if (!data.newEmail || !data.newEmail.includes('@')) {
    return { error: ERROR_MESSAGES.INVALID_INPUT }
  }

  // Ensure user profile exists
  await initializeUserData(user.id)

  // Update email in auth.users - Supabase will send a confirmation email
  // Email is stored in auth.users.email (not in metadata)
  // The email will NOT change until the user confirms via the confirmation link
  const { error: updateError } = await supabase.auth.updateUser({
    email: data.newEmail,
  })

  if (updateError) {
    // Map specific Supabase errors to safe messages
    console.error('Error updating email:', updateError)
    
    // Check for specific error types without exposing details
    if (updateError.message.includes('already registered') || updateError.message.includes('already exists')) {
      return { error: 'This email address is already in use.' }
    }
    if (updateError.message.includes('rate limit') || updateError.message.includes('too many')) {
      return { error: 'Too many requests. Please try again later.' }
    }
    
    return { error: ERROR_MESSAGES.EMAIL_UPDATE_FAILED }
  }

  // DO NOT update user_profiles table here - wait until email is confirmed
  // The auth callback will sync the email from auth.users to user_profiles
  // once the email is confirmed and auth.users.email is actually updated

  revalidatePath('/dashboard/settings')
  return { success: true, message: 'Email update confirmation sent. Please check your new email inbox.' }
}

export async function updatePassword(data: UpdatePasswordData) {
  const supabase = await createClient()

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError || !user) {
    return { error: ERROR_MESSAGES.NOT_AUTHENTICATED }
  }

  // Validate password length
  if (!data.newPassword || data.newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: data.newPassword,
  })

  if (updateError) {
    // Don't expose Supabase error details
    console.error('Error updating password:', updateError)
    
    // Check for rate limiting
    if (updateError.message.includes('rate limit') || updateError.message.includes('too many')) {
      return { error: 'Too many requests. Please try again later.' }
    }
    
    return { error: ERROR_MESSAGES.PASSWORD_UPDATE_FAILED }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
