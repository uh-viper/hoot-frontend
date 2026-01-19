-- Create notifications table to store notification templates/messages
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'welcome', 'system', 'promotion')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_welcome_notification BOOLEAN NOT NULL DEFAULT false, -- Only one can be true at a time
  send_to_all BOOLEAN NOT NULL DEFAULT false, -- If true, sends to all existing users when created
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create user_notifications table to track delivery and read status
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, notification_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON public.notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_is_welcome ON public.notifications(is_welcome_notification) WHERE is_welcome_notification = true;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Admins can manage notifications"
  ON public.notifications
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view active notifications"
  ON public.notifications
  FOR SELECT
  USING (is_active = true);

-- User notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user notifications"
  ON public.user_notifications
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "System can insert user notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT INSERT, DELETE ON public.user_notifications TO authenticated;

-- Function to ensure only one welcome notification exists
CREATE OR REPLACE FUNCTION public.ensure_single_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_welcome_notification = true THEN
    -- Set all other notifications to not be welcome notification
    UPDATE public.notifications
    SET is_welcome_notification = false
    WHERE id != NEW.id AND is_welcome_notification = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure single welcome notification
CREATE TRIGGER ensure_single_welcome_notification_trigger
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (NEW.is_welcome_notification = true)
  EXECUTE FUNCTION public.ensure_single_welcome_notification();

-- Function to send notification to all users
CREATE OR REPLACE FUNCTION public.send_notification_to_all_users(p_notification_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.user_notifications (user_id, notification_id)
  SELECT up.user_id, p_notification_id
  FROM public.user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_notifications un
    WHERE un.user_id = up.user_id AND un.notification_id = p_notification_id
  );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION public.send_notification_to_all_users(UUID) TO authenticated;

-- Add comments for clarity
COMMENT ON TABLE public.notifications IS 'Stores notification templates created by admins';
COMMENT ON TABLE public.user_notifications IS 'Tracks which notifications each user has received and read status';
COMMENT ON COLUMN public.notifications.is_welcome_notification IS 'If true, this notification is automatically sent to new users on signup';
COMMENT ON COLUMN public.notifications.send_to_all IS 'If true when created, notification is sent to all existing users';
