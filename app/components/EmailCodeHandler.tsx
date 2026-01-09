"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function EmailCodeHandlerContent() {
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

export default function EmailCodeHandler() {
  return (
    <Suspense fallback={null}>
      <EmailCodeHandlerContent />
    </Suspense>
  );
}
