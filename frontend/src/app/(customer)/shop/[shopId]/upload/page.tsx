'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createOrder } from '@/services/order.service';
import { createGuestSession } from '@/services/shop.service';
import { useAuthStore } from '@/store/auth';
import { Upload, FileText, X, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

const uploadSchema = z.object({
  copies: z.coerce.number().int().min(1).max(100),
  color: z.enum(['bw', 'color']),
  doubleSided: z.coerce.boolean(),
  orientation: z.enum(['portrait', 'landscape']),
  paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal']),
  paymentMethod: z.enum(['UPI', 'COUNTER', 'CARD']),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function UploadPage() {
  const params = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopId = params.shopId;
  const { isAuthenticated } = useAuthStore();

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      copies: 1,
      color: 'bw',
      doubleSided: false,
      orientation: 'portrait',
      paperSize: 'A4',
      paymentMethod: 'COUNTER',
    },
  });

  const colorValue = watch('color');
  const copiesValue = watch('copies');

  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Only PDF, PNG, and JPG files are supported.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be under 50MB.');
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const onSubmit = async (data: UploadFormData) => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // If customer is not logged in, ensure a guest session exists
      if (!isAuthenticated) {
        let guestToken = localStorage.getItem('velox_guest_session');
        if (!guestToken) {
          try {
            const session = await createGuestSession(shopId);
            guestToken = session.sessionToken;
            localStorage.setItem('velox_guest_session', guestToken);
            localStorage.setItem('velox_guest_session_id', session.guestSessionId);
          } catch {
            // Proceed; backend dev fallback will handle if offline
          }
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('shopId', shopId);
      formData.append('copies', String(data.copies));
      formData.append('color', data.color);
      formData.append('doubleSided', String(data.doubleSided));
      formData.append('orientation', data.orientation);
      formData.append('paperSize', data.paperSize);
      formData.append('paymentMethod', data.paymentMethod);

      const result = await createOrder(formData, (progress) => {
        setUploadProgress(progress);
      });

      router.push(
        `/shop/${shopId}/order-success?code=${result.orderCode}&cost=${result.estimatedCost}&pages=${result.totalPages}&id=${result.orderId}`,
      );
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to create order. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estimated cost preview
  const estimatedCost = copiesValue * (colorValue === 'color' ? 10 : 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-muted tracking-widest uppercase">Velox</p>
            <h1 className="text-lg font-semibold">Upload Document</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* File Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? 'border-primary bg-surface' : 'border-border'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted" />
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-muted hover:text-foreground p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="h-10 w-10 text-muted mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Drop your file here or click to browse</p>
                <p className="text-xs text-muted">PDF, PNG, JPG — Max 50MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </label>
            )}
          </div>

          {/* Print Settings */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
              Print Settings
            </h2>

            {/* Copies */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Copies</label>
              <input
                type="number"
                {...register('copies')}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.copies && (
                <p className="text-xs text-destructive mt-1">{errors.copies.message}</p>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Print Type</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center justify-center p-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                    colorValue === 'bw'
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border'
                  }`}
                >
                  <input type="radio" value="bw" {...register('color')} className="sr-only" />
                  Black & White
                </label>
                <label
                  className={`flex items-center justify-center p-3 rounded-xl border text-sm cursor-pointer transition-colors ${
                    colorValue === 'color'
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-border'
                  }`}
                >
                  <input type="radio" value="color" {...register('color')} className="sr-only" />
                  Color
                </label>
              </div>
            </div>

            {/* Double Sided */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Double Sided</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('doubleSided')} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Orientation</label>
              <select
                {...register('orientation')}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Paper Size</label>
              <select
                {...register('paperSize')}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="p-4 rounded-xl bg-surface border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Estimated Cost</span>
              <span className="text-lg font-semibold">₹{estimatedCost}</span>
            </div>
            <p className="text-xs text-muted mt-1">
              {colorValue === 'color' ? '₹10' : '₹2'}/page × {copiesValue}{' '}
              {copiesValue === 1 ? 'copy' : 'copies'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 px-6 rounded-xl font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Submit Order
              </>
            )}
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-center text-muted">
              You need to{' '}
              <a href="/login" className="underline underline-offset-2 hover:text-foreground">
                log in
              </a>{' '}
              to submit an order.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
