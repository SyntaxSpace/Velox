'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UploadRedirectPage() {
  const params = useParams<{ shopId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.shopId) {
      router.replace(`/shop/${params.shopId}`);
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
