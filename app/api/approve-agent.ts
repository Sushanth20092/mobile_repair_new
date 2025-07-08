import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

function generatePassword(length = 12) {
  // Generates a secure random password
  return randomBytes(length).toString('base64').slice(0, length)
}

export async function POST(req: NextRequest) {
  try {
    const { applicationId, adminUserId } = await req.json()
    if (!applicationId || !adminUserId) {
      return NextResponse.json({ error: 'Missing applicationId or adminUserId' }, { status: 400 })
    }

    // 1. Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('agent_applications')
      .select('*')
      .eq('id', applicationId)
      .single()
    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application is not pending' }, { status: 400 })
    }

    // 2. Generate password and create Supabase Auth user
    const tempPassword = generatePassword(14)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: application.name, role: 'agent' },
    })
    console.log('Supabase authUser:', authUser)
    if (authError || !authUser?.user) {
      return NextResponse.json({ error: 'Failed to create auth user', details: authError?.message }, { status: 500 })
    }
    const userId = authUser.user.id
    console.log('userId:', userId)
    if (!userId) {
      return NextResponse.json({ error: 'userId is missing after auth user creation' }, { status: 500 })
    }

    // 3. Insert into profiles
    console.log('Creating profile with userId:', userId)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      {
        id: userId,
        name: application.name,
        phone: application.phone,
        email: application.email,
        role: 'agent',
        is_verified: true,
        is_active: true,
        city_id: application.city_id, // add city_id
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    if (profileError) {
      console.error('Profile insert error:', profileError)
      return NextResponse.json({ error: 'Failed to insert profile', details: profileError.message }, { status: 500 })
    }

    // Add a short delay to ensure consistency
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 4. Fetch city name and state for address fields
    const { data: cityData, error: cityError } = await supabaseAdmin
      .from('cities')
      .select('name, state')
      .eq('id', application.city_id)
      .single()
    if (cityError || !cityData) {
      return NextResponse.json({ error: 'City not found for city_id' }, { status: 400 })
    }

    // 5. Insert into agents
    const agentInsertObj = {
      user_id: userId, // must match profiles(id)
      name: application.name, // required
      shop_name: application.shop_name, // required
      shop_address_street: application.shop_address, // required
      shop_address_city: cityData.name, // required
      shop_address_state: cityData.state, // required
      shop_address_pincode: application.pincode, // required
      shop_address_landmark: application.shop_landmark || '', // nullable, default to empty string if not present
      id_proof: application.id_proof, // required
      city_id: application.city_id, // required
      specializations: application.specializations || [],
      rating_average: 0, // default
      rating_count: 0, // default
      status: 'approved', // default to approved
      is_online: false, // default
      last_seen: null, // nullable
      completed_jobs: 0, // default
      earnings_total: 0, // default
      earnings_pending: 0, // default
      earnings_paid: 0, // default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      email: application.email, // required
      phone: application.phone, // required
      experience: application.experience || '', // nullable
    }
    console.log('Inserting into agents:', agentInsertObj)
    const { error: agentError } = await supabaseAdmin.from('agents').insert([
      agentInsertObj
    ])
    if (agentError) {
      console.error('Agent insert error:', agentError)
      return NextResponse.json({ error: 'Failed to insert agent', details: agentError.message }, { status: 500 })
    }

    // 6. Insert into agent_credentials
    const { error: credError } = await supabaseAdmin.from('agent_credentials').insert([
      {
        email: application.email,
        temp_password: tempPassword,
        agent_application_id: applicationId,
        is_used: false,
        created_at: new Date().toISOString(),
      },
    ])
    if (credError) {
      return NextResponse.json({ error: 'Failed to insert credentials', details: credError.message }, { status: 500 })
    }

    // 7. Update application status
    const { error: updateError } = await supabaseAdmin.from('agent_applications').update({
      status: 'approved',
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', applicationId)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update application', details: updateError.message }, { status: 500 })
    }

    // 8. Return credentials for admin display
    return NextResponse.json({
      email: application.email,
      tempPassword,
      applicationId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
} 