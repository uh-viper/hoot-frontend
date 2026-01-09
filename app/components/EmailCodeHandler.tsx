"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function EmailCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Handle email confirmation code if present
    const code = searchParams.get('code');
    if (code) {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('code', code);
      router.replace(callbackUrl.toString());
    }
  }, [searchParams, router]);

  return null;
}
