import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');
    const getDefault = searchParams.get('default') === 'true';

    if (configId) {
      // Get specific configuration by ID
      const { data, error } = await supabase
        .from('qz_editor_configurations')
        .select('*')
        .eq('id', configId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(data);
    } else if (getDefault) {
      // Get default configuration
      const { data, error } = await supabase
        .from('qz_editor_configurations')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data || null);
    } else {
      // Get all configurations
      const { data, error } = await supabase
        .from('qz_editor_configurations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error in GET /api/qz-config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, configuration, isDefault } = body;

    if (!name || !configuration) {
      return NextResponse.json({ error: 'Name and configuration are required' }, { status: 400 });
    }

    // If this is being set as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('qz_editor_configurations')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('qz_editor_configurations')
      .insert([{
        name,
        description: description || null,
        configuration,
        is_default: isDefault || false
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/qz-config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, configuration, isDefault } = body;

    if (!id || !name || !configuration) {
      return NextResponse.json({ error: 'ID, name and configuration are required' }, { status: 400 });
    }

    // If this is being set as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('qz_editor_configurations')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('qz_editor_configurations')
      .update({
        name,
        description: description || null,
        configuration,
        is_default: isDefault || false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/qz-config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json({ error: 'Configuration ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('qz_editor_configurations')
      .delete()
      .eq('id', configId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/qz-config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
