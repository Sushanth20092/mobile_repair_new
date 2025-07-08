import { supabase } from '@/lib/api';

export default function WaitingApproval() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Application Pending</h1>
      <p className="text-lg text-muted-foreground mb-2">Your agent application is under review.</p>
      <p className="text-md text-muted-foreground">You will be notified once your account is approved.</p>
    </div>
  )
} 