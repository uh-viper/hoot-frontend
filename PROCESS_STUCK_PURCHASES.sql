-- PROCESS STUCK PURCHASES IMMEDIATELY
-- Run this in Supabase Dashboard → SQL Editor

-- This will process all pending purchases for your user and add credits
DO $$
DECLARE
  purchase_record RECORD;
  credits_added INTEGER := 0;
  purchase_count INTEGER := 0;
BEGIN
  FOR purchase_record IN 
    SELECT id, user_id, credits 
    FROM purchases 
    WHERE status = 'pending' 
    AND user_id = '0a547d75-923e-4502-9778-fe99ec656c04'
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Call the function to add credits
      PERFORM public.add_credits_to_user(
        purchase_record.user_id,
        purchase_record.credits,
        purchase_record.id,
        NULL::TEXT
      );
      
      credits_added := credits_added + purchase_record.credits;
      purchase_count := purchase_count + 1;
      
      RAISE NOTICE '✅ Processed purchase % - Added % credits (Total so far: %)', 
        purchase_record.id, purchase_record.credits, credits_added;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed to process purchase %: %', purchase_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY: Processed % purchases, Added % total credits', purchase_count, credits_added;
END $$;

-- Verify credits were added
SELECT 
  user_id, 
  credits as total_credits,
  updated_at
FROM user_credits 
WHERE user_id = '0a547d75-923e-4502-9778-fe99ec656c04';

-- Verify all purchases are now completed
SELECT 
  id,
  credits,
  status,
  created_at
FROM purchases 
WHERE user_id = '0a547d75-923e-4502-9778-fe99ec656c04'
ORDER BY created_at DESC
LIMIT 10;
