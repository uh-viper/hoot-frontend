"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function EmailCodeHandlerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    // Handle email confirmation code if present
    const code = searchParams.get('code');
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }
  }, [searchParams, router, mounted]);

  return null;
}

export default function EmailCodeHandler() {
  return (
    <Suspense fallback={null}>
      <EmailCodeHandlerContent />
    </Suspense>
  );
}
