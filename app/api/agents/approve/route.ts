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
    const { application } = await req.json();
    if (!application) {
      return NextResponse.json({ message: 'Missing application data' }, { status: 400 });
    }
    const password = generateSecurePassword();
    // 1. Create Supabase Auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: application.email,
      password,
      email_confirm: true,
    });
    if (authError || !authUser?.user?.id) {
      return NextResponse.json({ message: authError?.message || "Failed to create auth user" }, { status: 500 });
    }
    const userId = authUser.user.id;
    // 2. Insert into profiles
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: userId,
      name: application.name,
      email: application.email,
      phone: application.phone,
      role: 'agent',
      is_verified: true,
      is_active: true,
      // ...other fields as needed
    }]);
    if (profileError) {
      return NextResponse.json({ message: profileError.message }, { status: 500 });
    }
    // 3. Insert into agents
    const { error: agentError } = await supabase.from('agents').insert([{
      user_id: userId,
      name: application.name,
      email: application.email,
      phone: application.phone,
      shop_name: application.shop_name,
      shop_address_street: application.shop_address,
      shop_address_city: application.city_name || '',
      shop_address_state: application.state || '',
      shop_address_pincode: application.pincode,
      shop_address_landmark: application.landmark || null,
      city_id: application.city_id,
      experience: application.experience,
      specializations: application.specializations,
      id_proof: application.id_proof,
      status: 'approved',
      is_online: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
    if (agentError) {
      return NextResponse.json({ message: agentError.message }, { status: 500 });
    }
    // 4. Update agent application
    const { error: updateError } = await supabase.from('agent_applications').update({
      status: 'approved',
      user_id: userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', application.id);
    if (updateError) {
      return NextResponse.json({ message: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Agent approved successfully' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 