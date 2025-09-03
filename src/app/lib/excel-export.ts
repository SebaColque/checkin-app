import * as ExcelJS from 'exceljs';
import { Attendee } from './supabase';

export async function exportAttendeesToExcel(attendees: Attendee[], filename: string = 'attendees.xlsx') {
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Participantes');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 5},
    { header: 'Nombre Completo', key: 'full_name', width: 25 },
    { header: 'Empresa', key: 'company', width: 25 },
    { header: 'Email', key: 'email', width: 15 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Estado', key: 'status', width: 13 },
    { header: 'Fecha Check-in', key: 'checked_in_at', width: 20 },
    { header: 'Número de Ticket', key: 'ticket_no', width: 17 },
    { header: 'Estación', key: 'station', width: 10 }
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
        fgColor: { argb: 'FFFFFF' } // Light yellow for pending
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

  // Create statistics worksheet
  const statsWorksheet = workbook.addWorksheet('Estadísticas');
  
  // Calculate statistics
  const totalAttendees = attendees.length;
  const checkedIn = attendees.filter(a => a.checked_in_at).length;
  const pending = totalAttendees - checkedIn;
  const percentageCheckedIn = totalAttendees > 0 ? ((checkedIn / totalAttendees) * 100).toFixed(1) : '0';
  
  // Get statistics by station
  const stationStats = attendees.reduce((acc, attendee) => {
    const station = attendee.station || 'Sin estación';
    if (!acc[station]) {
      acc[station] = { total: 0, checkedIn: 0 };
    }
    acc[station].total++;
    if (attendee.checked_in_at) {
      acc[station].checkedIn++;
    }
    return acc;
  }, {} as Record<string, { total: number; checkedIn: number }>);

  // Set up statistics worksheet columns
  statsWorksheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 15 },
    { header: 'Porcentaje', key: 'percentage', width: 15 }
  ];

  // Style the header row
  const statsHeaderRow = statsWorksheet.getRow(1);
  statsHeaderRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  statsHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '366092' }
  };
  statsHeaderRow.alignment = { horizontal: 'center' };

  // Add general statistics
  statsWorksheet.addRow({
    metric: 'Total de Participantes',
    value: totalAttendees,
    percentage: '100.0%'
  });
  
  statsWorksheet.addRow({
    metric: 'Participantes Registrados',
    value: checkedIn,
    percentage: `${percentageCheckedIn}%`
  });
  
  statsWorksheet.addRow({
    metric: 'Participantes Pendientes',
    value: pending,
    percentage: `${(100 - parseFloat(percentageCheckedIn)).toFixed(1)}%`
  });

  // Add empty row
  statsWorksheet.addRow({});

  // Add station statistics header
  statsWorksheet.addRow({
    metric: 'ESTADÍSTICAS POR ESTACIÓN',
    value: '',
    percentage: ''
  });

  // Style the section header
  const sectionHeaderRow = statsWorksheet.getRow(6);
  sectionHeaderRow.font = { bold: true };
  sectionHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E8F5E8' }
  };

  // Add station statistics
  Object.entries(stationStats).forEach(([station, stats]) => {
    const stationPercentage = stats.total > 0 ? ((stats.checkedIn / stats.total) * 100).toFixed(1) : '0';
    statsWorksheet.addRow({
      metric: `${station} - Total`,
      value: stats.total,
      percentage: ''
    });
    statsWorksheet.addRow({
      metric: `${station} - Registrados`,
      value: stats.checkedIn,
      percentage: `${stationPercentage}%`
    });
  });

  // Add borders to all cells in statistics worksheet
  statsWorksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Color code statistics rows
  statsWorksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber <= 4) { // General statistics rows
      if (rowNumber === 3) { // Checked in row
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E8F5E8' } // Light green
        };
      } else if (rowNumber === 4) { // Pending row
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2E8' } // Light orange
        };
      }
    }
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
