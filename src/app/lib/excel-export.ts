import * as ExcelJS from 'exceljs';
import { Attendee } from './supabase';

export async function exportAttendeesToExcel(attendees: Attendee[], filename: string = 'attendees.xlsx') {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Participantes');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Nombre Completo', key: 'full_name', width: 25 },
    { header: 'Empresa', key: 'company', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Fecha Check-in', key: 'checked_in_at', width: 20 },
    { header: 'Número de Ticket', key: 'ticket_no', width: 15 },
    { header: 'Estación', key: 'station', width: 12 }
  ];

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '366092' }
  };
  headerRow.alignment = { horizontal: 'center' };

  // Add data rows
  attendees.forEach((attendee, index) => {
    const row = worksheet.addRow({
      id: attendee.id,
      full_name: attendee.full_name,
      company: attendee.company || '',
      email: attendee.email || '',
      phone: attendee.phone || '',
      status: attendee.checked_in_at ? 'Registrado' : 'Pendiente',
      checked_in_at: attendee.checked_in_at ? new Date(attendee.checked_in_at).toLocaleString('es-ES') : '',
      ticket_no: attendee.ticket_no || '',
      station: attendee.station || ''
    });

    // Color code rows based on status
    if (attendee.checked_in_at) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E8F5E8' } // Light green for checked in
      };
    } else {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8E1' } // Light yellow for pending
      };
    }
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add summary at the bottom
  const summaryStartRow = attendees.length + 3;
  const totalAttendees = attendees.length;
  const checkedIn = attendees.filter(a => a.checked_in_at).length;
  const pending = totalAttendees - checkedIn;

  worksheet.addRow([]);
  worksheet.addRow(['RESUMEN:', '', '', '', '', '', '', '', '']);
  worksheet.addRow(['Total de Participantes:', totalAttendees, '', '', '', '', '', '', '']);
  worksheet.addRow(['Registrados:', checkedIn, '', '', '', '', '', '', '']);
  worksheet.addRow(['Pendientes:', pending, '', '', '', '', '', '', '']);

  // Style summary section
  const summaryRows = [summaryStartRow + 1, summaryStartRow + 2, summaryStartRow + 3, summaryStartRow + 4];
  summaryRows.forEach(rowNum => {
    const row = worksheet.getRow(rowNum);
    row.font = { bold: true };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F0F0F0' }
    };
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Create blob and download
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function generateExcelFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `participantes_${dateStr}_${timeStr}.xlsx`;
}
