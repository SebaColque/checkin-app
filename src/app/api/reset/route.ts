import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

export const runtime = 'nodejs';

export async function POST() {
  try {
    // Call the reset function that should be created in Supabase
    const { error } = await supabase.rpc('reset_checkin_system');

    if (error) {
      console.error('Error resetting system:', error);
      return NextResponse.json(
        { error: 'Error al resetear el sistema: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sistema reseteado correctamente. Secuencia de tickets reiniciada y tabla de participantes completamente limpiada.' 
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
