import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { category_id, model_name, brand, image = null, common_faults = null } = await req.json();
    if (!category_id || !model_name || !brand) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    // 1. Check if model exists
    let { data: model, error: modelError } = await supabase
      .from('models')
      .select('*')
      .eq('name', model_name.trim())
      .eq('category_id', category_id)
      .maybeSingle();
    if (modelError) {
      return NextResponse.json({ message: modelError.message }, { status: 500 });
    }
    let model_id = model?.id;
    if (!model_id) {
      // 2. Insert new model
      const { data: newModel, error: insertModelError } = await supabase
        .from('models')
        .insert([{ name: model_name.trim(), category_id }])
        .select()
        .maybeSingle();
      if (insertModelError || !newModel) {
        return NextResponse.json({ message: insertModelError?.message || 'Failed to create model' }, { status: 500 });
      }
      model_id = newModel.id;
    }
    // 3. Insert device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert([{ category_id, model_id, brand, image, common_faults }])
      .select()
      .maybeSingle();
    if (deviceError) {
      if (deviceError.message && deviceError.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ message: 'Device already exists.' }, { status: 409 });
      }
      return NextResponse.json({ message: deviceError.message }, { status: 500 });
    }
    return NextResponse.json({ device }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 