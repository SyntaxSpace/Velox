'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  provisionShop,
  ProvisionShopInput,
  ProvisionShopResponse,
} from '@/services/partner.service';
import { useAuthStore } from '@/store/auth';
import {
  ArrowLeft,
  Store,
  Key,
  Copy,
  Check,
  CheckCircle2,
  Printer,
  ExternalLink,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function ProvisionShopPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('velox_token') : null;
    if (!token && !isAuthenticated) {
      router.push('/partner/login');
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState<ProvisionShopInput>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    operatingHours: '9:00 AM - 9:00 PM',
    pricePerPageBW: 2.0,
    pricePerPageColor: 10.0,
    duplexDiscount: 0.5,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    temporaryPassword: '',
  });

  const [createdResult, setCreatedResult] = useState<ProvisionShopResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Vlx!';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, temporaryPassword: pass }));
  };

  useEffect(() => {
    generateRandomPassword();
  }, []);

  const provisionMutation = useMutation({
    mutationFn: (input: ProvisionShopInput) => provisionShop(input),
    onSuccess: (data) => {
      setCreatedResult(data);
      queryClient.invalidateQueries({ queryKey: ['partnerShops'] });
      queryClient.invalidateQueries({ queryKey: ['partnerStats'] });
    },
    onError: (err: any) => {
      setErrorMsg(
        err.response?.data?.message ||
          err.message ||
          'Failed to provision shop. Please check details.',
      );
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    provisionMutation.mutate(formData);
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const text = `VELOX STORE ONBOARDING CREDENTIALS\n--------------------------------\nShop Name: ${createdResult.shop.name}\nPublic ID: ${createdResult.shop.publicShopId}\nLogin URL: ${window.location.origin}/shop-owner/login\nOwner Email: ${createdResult.owner.email}\nTemporary Password: ${createdResult.temporaryPassword || createdResult.owner.temporaryPassword}\n\nNote: You will be prompted to choose a new password upon first sign-in.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintHandoverSlip = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Context */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/partner"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Network Overview
          </Link>
          <span className="text-[11px] font-mono font-medium text-muted bg-surface border border-border px-2 py-0.5 rounded-md">
            PROVISIONING
          </span>
        </div>

        {/* Success Modal / Store Activation Slip */}
        {createdResult ? (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  Store Successfully Provisioned
                </h2>
                <p className="text-xs text-muted">
                  The shop and owner credentials are active on the Velox edge network.
                </p>
              </div>
            </div>

            {/* Structured Handover Slip */}
            <div className="p-6 rounded-xl bg-background border border-border space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  Store Handover Record
                </span>
                <span className="font-mono text-xs text-foreground bg-surface border border-border px-2 py-0.5 rounded">
                  ID: {createdResult.shop.publicShopId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted block text-[11px] mb-0.5">Store Name</span>
                  <span className="text-foreground font-semibold text-sm">
                    {createdResult.shop.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] mb-0.5">Operator Name</span>
                  <span className="text-foreground font-semibold text-sm">
                    {createdResult.owner.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] mb-0.5">Login Email</span>
                  <span className="font-mono text-foreground font-medium text-sm">
                    {createdResult.owner.email}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px] mb-0.5">
                    Temporary Access Password
                  </span>
                  <span className="font-mono text-foreground font-semibold text-sm bg-surface px-2 py-1 rounded border border-border inline-block">
                    {createdResult.temporaryPassword || createdResult.owner.temporaryPassword}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-border text-xs text-muted flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-foreground mt-0.5" />
                <span>
                  The shop owner is required to set a permanent password upon first login. Share
                  these credentials with the store operator to complete activation.
                </span>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCopyCredentials}
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-surface text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copied' : 'Copy Credentials'}
              </button>

              <button
                onClick={handlePrintHandoverSlip}
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-surface text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4 text-muted" />
                Print Handover Slip
              </button>

              <Link
                href={`/shop/${createdResult.shop.publicShopId}`}
                target="_blank"
                className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-surface text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="h-4 w-4 text-muted" />
                Preview Counter Stand
              </Link>

              <button
                onClick={() => {
                  setCreatedResult(null);
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    pincode: '',
                    operatingHours: '9:00 AM - 9:00 PM',
                    pricePerPageBW: 2.0,
                    pricePerPageColor: 10.0,
                    duplexDiscount: 0.5,
                    ownerName: '',
                    ownerEmail: '',
                    ownerPhone: '',
                    temporaryPassword: '',
                  });
                  generateRandomPassword();
                }}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.99] transition-all ml-auto shadow-sm"
              >
                Provision Another Store
              </button>
            </div>
          </div>
        ) : (
          /* Clean Provisioning Form */
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Provision New Store & Owner Account
              </h1>
              <p className="text-xs text-muted mt-1">
                Configure commercial details, local page rates, and credentials for the store
                operator.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Store Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Store className="h-4 w-4 text-muted" />
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    1. Store Details
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Store Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Apex Digital Prints"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Store Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Store Official Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="counter@apexprints.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Plot 12, Station Road, Near Central Library"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">City</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="Chhatrapati Sambhajinagar"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      placeholder="431005"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing Configuration */}
              <div className="pt-5 border-t border-border">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  2. Pricing Configuration (₹ INR)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      B&W Rate / Page (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      name="pricePerPageBW"
                      required
                      value={formData.pricePerPageBW}
                      onChange={handleChange}
                      className="w-full h-10 text-sm font-mono px-3.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Color Rate / Page (₹) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      name="pricePerPageColor"
                      required
                      value={formData.pricePerPageColor}
                      onChange={handleChange}
                      className="w-full h-10 text-sm font-mono px-3.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Duplex Discount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      name="duplexDiscount"
                      value={formData.duplexDiscount}
                      onChange={handleChange}
                      className="w-full h-10 text-sm font-mono px-3.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Owner Credentials */}
              <div className="pt-5 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="h-4 w-4 text-muted" />
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    3. Store Operator Account
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Operator Full Name *
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      required
                      placeholder="e.g. Ramesh Joshi"
                      value={formData.ownerName}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Operator Login Email *
                    </label>
                    <input
                      type="email"
                      name="ownerEmail"
                      required
                      placeholder="owner@apexprints.com"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Operator Mobile Phone
                    </label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      placeholder="+91 98765 00010"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      className="w-full h-10 text-sm px-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-foreground">
                        Temporary Password *
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </button>
                    </div>
                    <input
                      type="text"
                      name="temporaryPassword"
                      required
                      value={formData.temporaryPassword}
                      onChange={handleChange}
                      className="w-full h-10 text-sm font-mono px-3.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground focus:border-foreground transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-border flex justify-end">
                <button
                  type="submit"
                  disabled={provisionMutation.isPending}
                  className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-medium text-xs sm:text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
                >
                  {provisionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Provisioning Store...</span>
                    </>
                  ) : (
                    <span>Provision Store & Owner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
