'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Phone, ArrowLeft } from 'lucide-react';

const DEMO_ACCOUNTS = {
  '9999999999': {
    user: {
      id: 'admin-uuid-9999',
      role: 'admin',
      full_name: 'Prashant',
      operator_id: 'admin',
    },
    redirectTo: '/dashboard',
  },
  '8888888888': {
    user: {
      id: 'worker-uuid-1234',
      role: 'field_worker',
      full_name: 'Rajesh Kumar',
      operator_id: '1234',
      facility_id: 'facility-uuid-5678',
      facility_name: 'New Delhi Ward 14 Center',
      facility_lat: 28.6139,
      facility_lng: 77.2090,
      facility_radius: 5000,
    },
    redirectTo: '/collect',
  },
} as const;

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(-10);

const getSupabaseClient = async () => {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
};

export default function LoginPage() {
  const router = useRouter();

  // Authentication Flow States
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  
  // Errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Timer for Resend
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Refs for OTP Input Boxes to auto-advance focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Toast automatic dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Timer tick for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const triggerNetworkErrorToast = () => {
    setToastMessage("No internet. Please try again when connected.");
  };

  const getDemoAccount = (value: string) => {
    const normalizedPhone = normalizePhoneNumber(value);
    return DEMO_ACCOUNTS[normalizedPhone as keyof typeof DEMO_ACCOUNTS] ?? null;
  };

  const applyDemoSession = (value: string) => {
    const demoAccount = getDemoAccount(value);
    if (demoAccount) {
      localStorage.setItem('dmrv-user', JSON.stringify(demoAccount.user));
      router.replace(demoAccount.redirectTo);
      return;
    }

    const normalizedPhone = normalizePhoneNumber(value);
    localStorage.setItem('dmrv-user', JSON.stringify({
      id: `worker-uuid-${normalizedPhone}`,
      role: 'field_worker',
      full_name: `Worker ${normalizedPhone.slice(-4)}`,
      operator_id: normalizedPhone.slice(-4),
      facility_id: 'facility-uuid-5678',
      facility_name: 'New Delhi Ward 14 Center',
      facility_lat: 28.6139,
      facility_lng: 77.2090,
      facility_radius: 5000,
    }));
    router.replace('/collect');
  };

  const resolveUserProfile = async (authUserId: string, phone: string) => {
    const supabase = await getSupabaseClient();
    const digits = phone.replace(/\D/g, '');
    const fullPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    const { data: profileById, error: profileByIdError } = await supabase
      .from('users')
      .select('role, name, id')
      .eq('id', authUserId)
      .maybeSingle();

    if (profileById && !profileByIdError) {
      return profileById;
    }

    const candidatePhones = [fullPhone, digits];
    for (const candidate of candidatePhones) {
      const { data: profileByPhone, error: profileByPhoneError } = await supabase
        .from('users')
        .select('role, name, id')
        .eq('mobile', candidate)
        .maybeSingle();

      if (profileByPhone && !profileByPhoneError) {
        return profileByPhone;
      }
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('users')
      .insert([
        {
          id: authUserId,
          name: `User ${digits.slice(-4) || 'new'}`,
          mobile: fullPhone,
          role: 'field_worker',
          status: 'active',
        },
      ])
      .select('role, name, id')
      .single();

    if (createError) {
      throw createError;
    }

    return createdProfile;
  };

  // Step 1: Submit Phone Number to Supabase Auth OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInlineError(null);

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate 10-digit number
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      const demoAccount = getDemoAccount(normalizedPhone);

      if (demoAccount) {
        applyDemoSession(normalizedPhone);
        return;
      }

      const fullPhone = `+91${normalizedPhone}`;
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        // If offline network failure
        if (error.message.toLowerCase().includes('fetch') || !navigator.onLine) {
          triggerNetworkErrorToast();
        } else {
          throw error;
        }
      } else {
        setPhoneNumber(normalizedPhone);
        setStep(2);
        setCountdown(30);
        setCanResend(false);
        setOtpValues(Array(6).fill(''));
      }
    } catch (err: any) {
      console.error('OTP Send error:', err);
      setErrorMessage(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInlineError(null);

    const token = otpValues.join('');
    if (token.length < 6) {
      setInlineError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const fullPhone = `+91${normalizedPhone}`;
      const demoAccount = getDemoAccount(normalizedPhone);

      if (demoAccount) {
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Mock test account validations: OTP is 123456
        if (token === '123456') {
          applyDemoSession(normalizedPhone);
        } else {
          setInlineError('Invalid OTP. Use 123456 for testing.');
        }
      } else {
        // Real Supabase Auth verification
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token,
          type: 'sms',
        });

        if (error) {
          if (!navigator.onLine) {
            triggerNetworkErrorToast();
          } else {
            setInlineError('Invalid OTP. Please try again.');
          }
        } else if (data.user) {
          try {
            const profile = await resolveUserProfile(data.user.id, normalizedPhone);

            localStorage.setItem('dmrv-user', JSON.stringify({
              id: profile.id,
              role: profile.role,
              full_name: profile.name,
              operator_id: data.user.phone || '',
            }));

            if (profile.role === 'admin') {
              router.replace('/dashboard');
            } else {
              router.replace('/collect');
            }
          } catch (profileError: any) {
            console.error('Error fetching user profile:', profileError);
            setErrorMessage('Profile not found. Contact administrator.');
          }
        }
      }
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setInlineError(null);
    setCountdown(30);
    setCanResend(false);
    setOtpValues(Array(6).fill(''));

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const fullPhone = `+91${normalizedPhone}`;
      const demoAccount = getDemoAccount(normalizedPhone);

      if (!demoAccount) {
        const supabase = await getSupabaseClient();
        const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (error && (!navigator.onLine || error.message.toLowerCase().includes('fetch'))) {
          triggerNetworkErrorToast();
        }
      }
    } catch (e) {
      console.error('Resend failed:', e);
    }
  };

  // Focus navigation handlers for individual OTP input boxes
  const handleOtpChange = (index: number, val: string) => {
    const cleanValue = val.replace(/[^0-9]/g, '');
    const digit = cleanValue.slice(-1);

    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);

    // Clear inline error if user types
    setInlineError(null);

    // Auto-advance focus to next sibling
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newValues = [...otpValues];
      
      if (otpValues[index]) {
        // Clear current value
        newValues[index] = '';
        setOtpValues(newValues);
      } else if (index > 0) {
        // Move focus backward if current cell is empty
        newValues[index - 1] = '';
        setOtpValues(newValues);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpValues(digits);
      setInlineError(null);
      otpRefs.current[5]?.focus();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-white relative">
      
      {/* Top-Right Language Toggle (Non-functional MVP display) */}
      <div className="absolute top-4 right-4 flex items-center bg-gray-100 border border-gray-200 rounded-full p-0.5 shadow-3xs select-none">
        <span className="bg-[#1B6B3A] text-white px-2.5 py-0.5 rounded-full shadow-3xs text-[10px] font-bold">EN</span>
        <span className="text-gray-400 px-2.5 py-0.5 text-[10px] font-bold">हिं</span>
      </div>

      <div className="w-full max-w-[390px] space-y-6">
        
        {/* Logo and Branding Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-[#1B6B3A] flex items-center justify-center text-white shadow-xs">
              <Check className="h-6 w-6 stroke-[3.5]" />
            </div>
            <span className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">dMRV</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-muted">Waste Verification Platform</h1>
          </div>
        </div>

        {/* Centered Auth Card */}
        <Card className="border border-border/80 shadow-md bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            
            {step === 1 ? (
              /* Step 1: Phone Input */
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="phone-input" className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Enter your mobile number
                  </label>
                  <div className="relative flex rounded-xl border border-border bg-white focus-within:ring-2 focus-within:ring-[#1B6B3A] focus-within:border-[#1B6B3A] overflow-hidden transition-all shadow-3xs">
                    {/* Non-editable +91 prefix */}
                    <div className="flex items-center justify-center px-3 bg-gray-50 border-r border-border text-xs font-bold text-text-muted select-none">
                      +91
                    </div>
                    <Input
                      id="phone-input"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-xs font-bold tracking-wider pl-3 w-full"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium leading-normal animate-in fade-in duration-200">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-xs font-bold bg-[#1B6B3A] hover:bg-[#15522c] text-white rounded-xl shadow-xs gap-1.5 transition-all"
                  disabled={isLoading}
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{isLoading ? 'Sending...' : 'Send OTP'}</span>
                </Button>

                {/* Local Demo Accounts Hint helper */}
                <div className="p-3 bg-emerald-50/50 border border-[#1B6B3A]/10 rounded-xl space-y-1 text-[10px] text-text-muted">
                  <span className="font-bold text-[#1B6B3A] block">Test Accounts (SMS Code: 123456):</span>
                  <p>• Admin: <span className="font-bold">9999999999</span></p>
                  <p>• Worker: <span className="font-bold">8888888888</span></p>
                </div>
              </form>
            ) : (
              /* Step 2: OTP Verification */
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Enter the 6-digit code sent to +91{phoneNumber}
                  </label>
                  
                  {/* 6 Individual input cells */}
                  <div className="flex gap-2 justify-between py-1">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={val}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        className="w-11 h-12 border border-border rounded-xl text-center font-mono text-base font-bold bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-[#1B6B3A] text-text-primary shadow-3xs transition-all"
                        disabled={isLoading}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {/* Invalid OTP inline error displayed exactly below the boxes */}
                  {inlineError && (
                    <p className="text-[11px] text-red-600 font-bold mt-1 text-left animate-in fade-in duration-200">
                      {inlineError}
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-2.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium leading-normal animate-in fade-in duration-200">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-xs font-bold bg-[#1B6B3A] hover:bg-[#15522c] text-white rounded-xl shadow-xs transition-all"
                  disabled={isLoading}
                >
                  <span>{isLoading ? 'Verifying...' : 'Verify'}</span>
                </Button>

                {/* Resend actions & countdown */}
                <div className="text-center pt-1">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-xs text-[#1B6B3A] hover:underline font-bold"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted font-medium">
                      Didn't receive it? Resend in <span className="font-bold font-mono">{countdown}s</span>
                    </span>
                  )}
                </div>

                {/* Back button to re-enter number */}
                <button
                  type="button"
                  onClick={() => { setStep(1); setErrorMessage(null); setInlineError(null); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[10px] text-text-muted hover:text-text-primary hover:underline pt-3 border-t border-border/40 font-bold uppercase tracking-wider transition-all"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Change Number</span>
                </button>
              </form>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Network Failure Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[340px] px-4 py-3 bg-red-600 text-white rounded-xl shadow-lg border border-red-500 animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs font-bold leading-tight text-center">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
