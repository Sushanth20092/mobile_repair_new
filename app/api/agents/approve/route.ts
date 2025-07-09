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
    // Log all metadata before user creation
    console.log('Agent approval metadata:', {
      name: application.name,
      phone: application.phone,
      role: 'agent',
      city_id: application.city_id,
      city_id_type: typeof application.city_id,
      email: application.email,
    });
    // Validate required metadata fields
    function isValidUUID(uuid: string) {
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);
    }
    if (!application.name || typeof application.name !== 'string' || !application.name.trim()) {
      return NextResponse.json({ message: 'Missing or invalid name in application' }, { status: 400 });
    }
    if (!application.phone || typeof application.phone !== 'string' || !application.phone.trim()) {
      return NextResponse.json({ message: 'Missing or invalid phone in application' }, { status: 400 });
    }
    if (!application.city_id || typeof application.city_id !== 'string' || !isValidUUID(application.city_id)) {
      return NextResponse.json({ message: 'Missing or invalid city_id in application (must be a valid UUID)' }, { status: 400 });
    }
    // Check if email already exists in Supabase Auth
    const { data: userList, error: userListError } = await supabase.auth.admin.listUsers();
    if (userListError) {
      console.error('Error checking for existing user:', userListError);
      return NextResponse.json({ message: 'Error checking for existing user', details: userListError }, { status: 500 });
    }
    const emailExists = userList?.users?.some((u: any) => u.email?.toLowerCase() === application.email.toLowerCase());
    if (emailExists) {
      return NextResponse.json({ message: 'A user with this email already exists.' }, { status: 409 });
    }
    // Log password and email for debugging (do not log passwords in production)
    console.log('Attempting to create user:', { email: application.email, password });
    // 1. Create Supabase Auth user with all required metadata
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: application.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: application.name,
        phone: application.phone,
        role: 'agent',
        city_id: application.city_id,
      },
    });
    if (authError || !authUser?.user?.id) {
      console.error('Supabase createUser error:', authError);
      return NextResponse.json({ message: authError?.message || 'Database error creating new user', details: authError }, { status: 500 });
    }
    const userId = authUser.user.id;
    // 2. DO NOT insert into profiles (trigger will do it)
    // 3. Insert into agents (all required fields)
    const { error: agentError } = await supabase.from('agents').insert([{
      user_id: userId,
      name: application.name,
      email: application.email,
      phone: application.phone,
      shop_name: application.shop_name,
      shop_address_street: application.shop_address,
      shop_address_city: application.city_name || application.city || '',
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
      console.error('Agent insert error:', agentError);
      return NextResponse.json({ message: 'Failed to insert agent: ' + agentError.message }, { status: 500 });
    }
    // 4. Insert into agent_credentials (all required fields)
    const { error: credentialsError } = await supabase.from('agent_credentials').insert([{
      email: application.email,
      temp_password: password,
      agent_application_id: application.id,
      is_used: false,
      created_at: new Date().toISOString(),
    }]);
    if (credentialsError) {
      console.error('Agent credentials insert error:', credentialsError);
      return NextResponse.json({ message: 'Failed to insert agent credentials: ' + credentialsError.message }, { status: 500 });
    }
    // 5. Update agent application
    const { error: updateError } = await supabase.from('agent_applications').update({
      status: 'approved',
      user_id: userId,
      reviewed_by: application.admin_id || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', application.id);
    if (updateError) {
      console.error('Agent application update error:', updateError);
      return NextResponse.json({ message: 'Failed to update agent application: ' + updateError.message }, { status: 500 });
    }
    // Return the generated password for display
    return NextResponse.json({ message: 'Agent approved successfully', tempPassword: password }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 