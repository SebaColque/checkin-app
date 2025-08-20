'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase, Attendee } from './lib/supabase';
import { printLabelHtml, ensureQZ, listPrinters, getDefaultPrinter } from './lib/print';

export default function Page() {
  const [q, setQ] = useState('');
  const [allAttendees, setAllAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) INIT seguro en SSR: nunca tocar localStorage en el render inicial
  const [station, setStation] = useState<string>('N1');
  const [printer, setPrinter] = useState<string>('');    // ← empieza vacío
  const [printers, setPrinters] = useState<string[]>([]);

  // 2) Cargar valores de localStorage ya en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStation(localStorage.getItem('station') || 'N1');
    setPrinter(localStorage.getItem('printer') || '');
  }, []);

  // 3) Guardar cambios en localStorage sólo en cliente
  // Guardar cambios
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('station', station); }, [station]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('printer', printer); }, [printer]);

  // Detectar impresoras (y default) una vez
  // Al montar: si no hay impresora guardada, intentá default
  useEffect(() => {
    (async () => {
      try {
        await ensureQZ();
        // Cargar lista si existe el método, si no al menos default
        const names = await listPrinters();
        setPrinters(names);
        if (!printer) {
          const def = await getDefaultPrinter();
          if (def) setPrinter(def);
        }
      } catch (e) {
        console.warn('QZ no disponible aún', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testPrint = async () => {
    if (!printer) return alert('Elegí una impresora');
    await printLabelHtml(printer, 'PRUEBA', 123);  // crea un PDF si usás “Print to PDF”
  };

  // Carga inicial de todos los participantes
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendees')
        .select('id, full_name, external_id, email, checked_in_at, ticket_no, station')
        .order('full_name');

      if (!abort) {
        if (error) console.error(error);
        setAllAttendees(data || []);
        setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  // Filtrado en tiempo real usando useMemo
  const filteredAttendees = useMemo(() => {
    if (!q.trim()) {
      return allAttendees.slice(0, 500000); // Mostrar solo los primeros 50 si no hay búsqueda
    }
    const searchTerm = q.trim().toLowerCase();
    return allAttendees.filter(attendee => 
      attendee.full_name.toLowerCase().includes(searchTerm)
    ).slice(0, 500000); // Limitar a 50 resultados
  }, [allAttendees, q]);

  const pending = useMemo(() => filteredAttendees.filter(r => !r.checked_in_at), [filteredAttendees]);

  const checkIn = async (r: Attendee) => {
    const { data, error } = await supabase
      .rpc('check_in_attendee', { p_id: r.id, p_station: station });
  
    if (error) {
      console.error('RPC error', error);
      alert(`Error en check-in: ${error.message || 'ver consola'}`);
      return;
    }
  
    const row = data && data[0];
    if (!row) {
      alert('No se recibió respuesta del servidor');
      return;
    }
  
    // Si ya estaba checkeado, ticket_no puede venir con valor (perfecto).
    // Si viniera null, avisamos.
    if (row.ticket_no == null) {
      alert('Participante sin número asignado (ya estaba sin ticket?)');
      return;
    }
  
    await printLabelHtml(printer, r.full_name, row.ticket_no);
  
    // refrescamos UI local
    const copy = allAttendees.map(x =>
      x.id === r.id
        ? { ...x, checked_in_at: row.checked_in_at, ticket_no: row.ticket_no, station }
        : x
    );
    setAllAttendees(copy);
  };

  const reprint = async (r: Attendee) => {
    if (!r.ticket_no) return;
    await printLabelHtml(printer, r.full_name, r.ticket_no);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>

        {/* Import and Add Manual sections - Compact */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap'
        }}>
          <ImportBlock onImported={() => setQ(q)}/>
          <AddManual onAdded={(a) => setAllAttendees([a, ...allAttendees])} />
          <ResetBlock onReset={() => window.location.reload()} />
        </div>

        {/* Header */}
        <div className="card" style={{marginBottom: '24px'}}>
          <div className="card-header">
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: '0',
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                width: '40px',
                height: '40px',
                background: 'var(--primary)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>✓</span>
              Check-in Evento
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: 'var(--secondary)',
              fontSize: '16px'
            }}>
              Sistema de registro y control de asistencia
            </p>
          </div>

          {/* Configuration Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: 'var(--foreground)'
              }}>
                🏢 Estación
              </label>
              <input 
                value={station} 
                onChange={e=>setStation(e.target.value)} 
                placeholder="N1 / N2 / N3"
                style={{width: '100%'}}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: 'var(--foreground)'
              }}>
                🖨️ Impresora
              </label>
              <select style={{width: '300px'}} value={printer} onChange={e=>setPrinter(e.target.value)}>
                <option value="">{printers.length ? '— Elegí —' : '— Cargando/QZ —'}</option>
                {printers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '6px',
                color: 'var(--foreground)'
              }}>
                🔍 Buscar Participante
              </label>
              <input 
                autoFocus 
                value={q} 
                onChange={e=>setQ(e.target.value)} 
                placeholder="Escriba el nombre..."
                style={{width: '100%'}}
              />
            </div>
          </div>
        </div>

        

        {/* Results Section */}
        <div className="card">
          <div className="card-header">
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📋 Resultados
              {loading && <div className="loading"></div>}
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {filteredAttendees.length}
              </span>
            </h3>
          </div>

          {filteredAttendees.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--secondary)'
            }}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>👥</div>
              <p style={{fontSize: '16px', margin: '0'}}>
                {q ? 'No se encontraron participantes' : 'Comience escribiendo un nombre para buscar'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '8px'
            }}>
              {filteredAttendees.map(r => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  background: r.checked_in_at ? 'rgb(16 185 129 / 0.05)' : 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: r.checked_in_at ? 'var(--success)' : 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    {r.checked_in_at ? '✓' : r.full_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div style={{flex: 1}}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      color: 'var(--foreground)',
                      marginBottom: '4px'
                    }}>
                      {r.full_name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {r.checked_in_at ? (
                        <>
                          <span className="badge success">
                            ✓ Registrado
                          </span>
                          <span>#{r.ticket_no}</span>
                          <span>•</span>
                          <span>{new Date(r.checked_in_at).toLocaleString()}</span>
                          {r.station && (
                            <>
                              <span>•</span>
                              <span>{r.station}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="badge pending">
                          ⏳ Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {r.checked_in_at ? (
                    <button 
                      className="secondary"
                      onClick={() => reprint(r)}
                      style={{minWidth: '120px'}}
                    >
                      🖨️ Reimprimir
                    </button>
                  ) : (
                    <button 
                      className="success"
                      onClick={() => checkIn(r)}
                      style={{minWidth: '120px'}}
                    >
                      ✓ Registrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgb(59 130 246 / 0.05)',
            border: '1px solid rgb(59 130 246 / 0.2)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--primary)'
          }}>
            💡 <strong>Tip:</strong> Presione Enter para confirmar la búsqueda. Al hacer clic en "Registrar" se imprime automáticamente la etiqueta.
          </div>
        </div>
      </div>
    </div>
  );
}

/** ----- Componente: Importar Excel/CSV ----- */
import { parseFile } from './lib/readSpreadsheet';

function ImportBlock({ onImported }: { onImported: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [nameCol, setNameCol] = useState('');
  const [idCol, setIdCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [skipDupById, setSkipDupById] = useState(true);

  async function handleFile(f: File) {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!/\.(xlsx|csv)$/i.test(f.name)) return alert('Solo .xlsx o .csv');
    if (f.size > MAX_SIZE) return alert('Archivo muy grande (>5MB)');

    setFile(f);
    const { rows, headers } = await parseFile(f);
    setRows(rows);
    setColumns(headers);

    const guess = (alts: string[]) => headers.find((h: string) => alts.some(a => h.includes(a)));
    setNameCol(guess(['nombre', 'name', 'apellido']) || headers[0] || '');
    setIdCol(guess(['dni', 'doc', 'id', 'legajo']) || '');
    setEmailCol(guess(['mail', 'email', 'correo']) || '');
  }

  async function doImport() {
    if (!nameCol) return alert('Elegí la columna de NOMBRE');

    const subset = rows.slice(0, 5000).map(r => ({
      full_name: String(r[nameCol] ?? '').trim(),
      external_id: idCol ? String(r[idCol] ?? '').trim() || null : null,
      email: emailCol ? String(r[emailCol] ?? '').trim() || null : null
    })).filter(x => x.full_name);

    if (!subset.length) return alert('No hay filas válidas');

    const op = (skipDupById && subset.some(x => !!x.external_id))
      ? supabase.from('attendees').upsert(subset, { onConflict: 'external_id', ignoreDuplicates: false })
      : supabase.from('attendees').insert(subset);

    const { error } = await op;
    if (error) { alert('Error al importar'); console.error(error); return; }
    alert(`Importación OK (${subset.length} registros)`);
    setShowModal(false);
    setFile(null);
    onImported();
    // Recargar todos los participantes después de importar
    window.location.reload();
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        style={{
          padding: '12px 20px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          marginTop: '100px'
        }}
      >
        📁 Importar Excel/CSV
      </button>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📁 Importar Excel/CSV
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{marginBottom: '16px'}}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: 'var(--foreground)'
              }}>
                Seleccionar archivo
              </label>
              <input 
                type="file" 
                accept=".xlsx,.csv"
                onChange={e => e.target.files && handleFile(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  background: 'var(--background)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {file && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: 'var(--foreground)'
                    }}>
                      Columna NOMBRE *
                    </label>
                    <select value={nameCol} onChange={e=>setNameCol(e.target.value)} style={{width: '100%', fontSize: '13px'}}>
                      <option value="">— Seleccionar —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: 'var(--foreground)'
                    }}>
                      Columna ID
                    </label>
                    <select value={idCol} onChange={e=>setIdCol(e.target.value)} style={{width: '100%', fontSize: '13px'}}>
                      <option value="">— Opcional —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      color: 'var(--foreground)'
                    }}>
                      Columna Email
                    </label>
                    <select value={emailCol} onChange={e=>setEmailCol(e.target.value)} style={{width: '100%', fontSize: '13px'}}>
                      <option value="">— Opcional —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  padding: '8px',
                  background: 'var(--background)',
                  borderRadius: '6px'
                }}>
                  <input 
                    type="checkbox" 
                    id="skipDup"
                    checked={skipDupById}
                    onChange={e=>setSkipDupById(e.target.checked)}
                    style={{margin: '0'}}
                  />
                  <label htmlFor="skipDup" style={{
                    fontSize: '13px',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    margin: '0'
                  }}>
                    🔄 Evitar duplicados por ID
                  </label>
                </div>
                
                <div style={{display: 'flex', gap: '12px'}}>
                  <button onClick={doImport} style={{flex: 1}}>
                    📤 Importar Datos
                  </button>
                  <button onClick={() => setShowModal(false)} className="secondary">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}


/** ----- Componente: Reset System ----- */
function ResetBlock({ onReset }: { onReset: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!confirm('¿Estás seguro? Esto eliminará TODOS los participantes de la tabla y reiniciará la numeración de tickets. Esta acción NO se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        alert('Sistema reseteado correctamente');
        onReset();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error resetting system:', error);
      alert('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '12px 20px',
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      whiteSpace: 'nowrap',
      marginTop: '100px',
      opacity: loading ? 0.6 : 1
    }}>
      <button 
        onClick={handleReset}
        disabled={loading}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0'
        }}
      >
        {loading ? '⏳' : '🔄'} {loading ? 'Reseteando...' : 'Resetear Sistema'}
      </button>
    </div>
  );
}

/** ----- Componente: Alta manual ----- */
function AddManual({ onAdded }: { onAdded: (a: Attendee)=>void }) {
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [email, setEmail] = useState('');

  const add = async () => {
    const payload = { full_name: name.trim(), external_id: externalId.trim() || null, email: email.trim() || null };
    if (!payload.full_name) { alert('Nombre requerido'); return; }
    const { data, error } = await supabase.from('attendees')
      .insert(payload).select().single();
    if (error) { alert('Error al agregar'); console.error(error); return; }
    onAdded(data as any);
    setName(''); setExternalId(''); setEmail('');
  };

  return (
    <div className="card" style={{flex: 1, minWidth: '400px'}}>
      <div className="card-header">
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          margin: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👤 Agregar Participante
        </h3>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '4px',
            color: 'var(--foreground)'
          }}>
            Nombre y Apellido *
          </label>
          <input 
            placeholder="Nombre completo" 
            value={name} 
            onChange={e=>setName(e.target.value)}
            style={{width: '100%', fontSize: '14px'}}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '4px',
            color: 'var(--foreground)'
          }}>
            DNI/ID
          </label>
          <input 
            placeholder="12345678" 
            value={externalId} 
            onChange={e=>setExternalId(e.target.value)}
            style={{width: '100%', fontSize: '14px'}}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '4px',
            color: 'var(--foreground)'
          }}>
            Email
          </label>
          <input 
            type="email"
            placeholder="email@ejemplo.com" 
            value={email} 
            onChange={e=>setEmail(e.target.value)}
            style={{width: '100%', fontSize: '14px'}}
          />
        </div>
      </div>
      
      <button onClick={add} style={{width: '100%', padding: '10px'}}>
        ➕ Agregar
      </button>
    </div>
  );
}
