'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase, Attendee } from './lib/supabase';
import { printLabelHtml } from './lib/print';

export default function Page() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);

  // Config local por notebook
  const [station, setStation] = useState<string>(() => localStorage.getItem('station') || 'N1');
  const [printer, setPrinter] = useState<string>(() => localStorage.getItem('printer') || 'Xprinter');

  useEffect(() => { localStorage.setItem('station', station); }, [station]);
  useEffect(() => { localStorage.setItem('printer', printer); }, [printer]);

  // Carga inicial y cada vez que cambia la búsqueda
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendees')
        .select('id, full_name, external_id, email, checked_in_at, ticket_no, station')
        .ilike('full_name', `%${q}%`)
        .order('full_name')
        .limit(50);
      if (!abort) {
        if (error) console.error(error);
        setRows(data || []);
        setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [q]);

  const pending = useMemo(() => rows.filter(r => !r.checked_in_at), [rows]);

  const checkIn = async (r: Attendee) => {
    const { data, error } = await supabase.rpc('check_in_attendee', { p_id: r.id, p_station: station });
    if (error) { alert('Error en check-in'); console.error(error); return; }
    const row = data?.[0];
    if (!row?.ticket_no) { alert('Ya estaba registrado'); return; }

    await printLabelHtml(printer, r.full_name, row.ticket_no);
    // refrescamos resultados
    const copy = rows.map(x => x.id === r.id ? { ...x, checked_in_at: row.checked_in_at, ticket_no: row.ticket_no, station } : x);
    setRows(copy);
  };

  const reprint = async (r: Attendee) => {
    if (!r.ticket_no) return;
    await printLabelHtml(printer, r.full_name, r.ticket_no);
  };

  return (
    <div style={{padding:24, maxWidth:860, margin:'0 auto', fontFamily:'Inter, system-ui, Arial'}}>
      <h1>Check-in evento</h1>

      <fieldset style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, margin:'12px 0'}}>
        <label>Estación
          <input value={station} onChange={e=>setStation(e.target.value)} placeholder="N1 / N2 / N3"/>
        </label>
        <label>Impresora
          <input value={printer} onChange={e=>setPrinter(e.target.value)} placeholder="Nombre exacto en el sistema"/>
        </label>
        <label>Buscar
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Nombre…"/>
        </label>
      </fieldset>

      <ImportBlock onImported={() => setQ(q)} />

      <AddManual onAdded={(a) => setRows([a, ...rows])} />

      <h3 style={{marginTop:20}}>Resultados {loading && '…'}</h3>
      <ul style={{listStyle:'none', padding:0}}>
        {rows.map(r => (
          <li key={r.id} style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px solid #eee'}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>{r.full_name}</div>
              <div style={{fontSize:12, color:'#555'}}>
                {r.ticket_no ? `#${r.ticket_no} · ${new Date(r.checked_in_at!).toLocaleString()}` : '— pendiente —'}
                {r.station ? ` · ${r.station}` : ''}
              </div>
            </div>
            {r.checked_in_at
              ? <button onClick={()=>reprint(r)}>Reimprimir</button>
              : <button onClick={()=>checkIn(r)}>Asistió</button>}
          </li>
        ))}
      </ul>
      <p style={{marginTop:12, fontSize:12, color:'#666'}}>Tip: Enter confirma el campo de búsqueda, click en “Asistió” imprime de inmediato.</p>
    </div>
  );
}

/** ----- Componente: Importar Excel/CSV ----- */
import { parseFile } from './lib/readSpreadsheet';

function ImportBlock({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [nameCol, setNameCol] = useState('');
  const [idCol, setIdCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [skipDupById, setSkipDupById] = useState(true);

  async function handleFile(f: File) {
    // límites básicos
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
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

    // saneo: máximo 5000 filas por importación
    const subset = rows.slice(0, 5000).map(r => ({
      full_name: String(r[nameCol] ?? '').trim(),
      external_id: idCol ? String(r[idCol] ?? '').trim() || null : null,
      email: emailCol ? String(r[emailCol] ?? '').trim() || null : null
    })).filter(x => x.full_name);

    if (!subset.length) return alert('No hay filas válidas');

    // inserción/actualización
    // Si marcamos evitar duplicados por ID y llegó external_id, hacemos upsert por esa columna.
    const op = (skipDupById && subset.some(x => !!x.external_id))
      ? supabase.from('attendees').upsert(subset, { onConflict: 'external_id', ignoreDuplicates: false })
      : supabase.from('attendees').insert(subset);

    const { error } = await op;
    if (error) { alert('Error al importar'); console.error(error); return; }
    alert(`Importación OK (${subset.length} registros)`);
    onImported();
  }

  return (
    <div style={{margin:'16px 0', padding:12, border:'1px dashed #aaa', borderRadius:8}}>
      <h3>Importar Excel/CSV</h3>
      <input type="file" accept=".xlsx,.csv"
             onChange={e => e.target.files && handleFile(e.target.files[0])} />

      {file && (
        <>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:12}}>
            <label>Columna NOMBRE
              <select value={nameCol} onChange={e=>setNameCol(e.target.value)}>
                <option value="">—</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Columna ID (DNI/Legajo) (opcional)
              <select value={idCol} onChange={e=>setIdCol(e.target.value)}>
                <option value="">—</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Columna Email (opcional)
              <select value={emailCol} onChange={e=>setEmailCol(e.target.value)}>
                <option value="">—</option>
                {columns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{display:'flex', alignItems:'center', gap:8}}>
              <input type="checkbox" checked={skipDupById}
                     onChange={e=>setSkipDupById(e.target.checked)} />
              Evitar duplicados por ID (usa upsert)
            </label>
          </div>
          <button style={{marginTop:12}} onClick={doImport}>Importar</button>
        </>
      )}
      <div style={{fontSize:12, color:'#666', marginTop:8}}>
        Sugerencia: si podés, exportá a <b>CSV</b> antes de importar (más ligero y seguro).
      </div>
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
    <div style={{margin:'16px 0', padding:12, border:'1px dashed #aaa', borderRadius:8}}>
      <h3>Agregar participante</h3>
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:12}}>
        <input placeholder="Nombre y apellido" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="DNI/ID (opcional)" value={externalId} onChange={e=>setExternalId(e.target.value)} />
        <input placeholder="Email (opcional)" value={email} onChange={e=>setEmail(e.target.value)} />
        <button onClick={add}>Agregar</button>
      </div>
    </div>
  );
}
