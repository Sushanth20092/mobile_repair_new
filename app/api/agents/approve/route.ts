import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSecurePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    const { application, admin_id } = await req.json();
    if (!application) {
      return NextResponse.json({ message: 'Missing application data' }, { status: 400 });
    }
    // 1. Use user_id from application
    const userId = application.user_id;
    if (!userId) {
      return NextResponse.json({ message: 'Missing user_id in application' }, { status: 400 });
    }
    // 2. Update user's role in profiles to 'agent'
    const { error: profileError } = await supabase.from('profiles').update({ role: 'agent' }).eq('id', userId);
    if (profileError) {
      return NextResponse.json({ message: 'Failed to update user role: ' + profileError.message }, { status: 500 });
    }
    // 3. Insert into agents table with only the required fields
    const { error: agentError } = await supabase.from('agents').insert([{
      user_id: userId,
      shop_name: application.shop_name,
      shop_address_street: application.shop_address,
      shop_address_pincode: application.pincode,
      id_proof: application.id_proof,
      city_id: application.city_id,
      specializations: application.specializations,
      email: application.email,
      phone: application.phone,
      experience: application.experience,
      name: application.name,
      status: 'approved', // Explicitly set status to approved
      // All other fields use default values
    }]);
    if (agentError) {
      return NextResponse.json({ message: 'Failed to insert agent: ' + agentError.message }, { status: 500 });
    }
    // 4. Update agent_applications row
    const { error: updateError } = await supabase.from('agent_applications').update({
      status: 'approved',
      reviewed_by: admin_id || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', application.id);
    if (updateError) {
      return NextResponse.json({ message: 'Failed to update agent application: ' + updateError.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Agent approved successfully' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 