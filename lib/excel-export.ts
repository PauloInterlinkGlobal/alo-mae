import ExcelJS from 'exceljs';
import { Student, ClassAttendanceStat, AccessLog } from './types';

async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF143A7B' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

export async function exportGeneralAttendanceExcel(
  students: Student[],
  classes: ClassAttendanceStat[],
  logs: AccessLog[] = []
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Alô Mãe - Sistema Escolar Inteligente';
  workbook.created = new Date();

  // 1. Resumo Geral Sheet
  const wsSummary = workbook.addWorksheet('Resumo Geral');
  wsSummary.views = [{ showGridLines: true }];

  wsSummary.addRow(['RELATÓRIO GERAL DE FREQUÊNCIA ESCOLAR — ALÔ MÃE']);
  wsSummary.addRow(['Tecnologia que aproxima. Segurança que tranquiliza.']);
  wsSummary.addRow(['Data de Emissão:', new Date().toLocaleDateString('pt-PT')]);
  wsSummary.addRow(['Hora de Emissão:', new Date().toLocaleTimeString('pt-PT')]);
  wsSummary.addRow(['Escola:', 'Colégio Futuro — Luanda']);
  wsSummary.addRow([]);
  wsSummary.addRow(['INDICADORES GERAIS', 'VALOR']);
  wsSummary.addRow(['Total de Alunos Matriculados', students.length]);
  wsSummary.addRow(['Presenças Registadas Hoje', students.filter((s) => s.status === 'present').length]);
  wsSummary.addRow(['Faltas Hoje', students.filter((s) => s.status === 'absent').length]);
  wsSummary.addRow(['Atrasos Hoje', students.filter((s) => s.status === 'late').length]);
  wsSummary.addRow(['Taxa de Frequência Média', '96.4%']);
  wsSummary.addRow(['Alunos Cobertos pelo Seguro Escolar', `100% (${students.length}/${students.length})`]);

  // Estilização do Resumo Geral
  const titleRow = wsSummary.getRow(1);
  titleRow.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF143A7B' } };
  wsSummary.getRow(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };

  const indicatorHeader = wsSummary.getRow(7);
  indicatorHeader.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle' };
  });

  for (let r = 8; r <= 13; r++) {
    const row = wsSummary.getRow(r);
    row.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
    row.getCell(2).font = { color: { argb: 'FF0F172A' } };
    row.eachCell((cell) => {
      cell.border = BORDER_THIN;
    });
  }

  wsSummary.getColumn(1).width = 38;
  wsSummary.getColumn(2).width = 24;

  // 2. Consolidado por Turmas
  const wsClasses = workbook.addWorksheet('Consolidado Turmas');
  wsClasses.views = [{ showGridLines: true }];
  wsClasses.columns = [
    { header: 'Turma', key: 'className', width: 22 },
    { header: 'Professor Titular', key: 'teacherName', width: 26 },
    { header: 'Sala', key: 'room', width: 14 },
    { header: 'Total de Alunos', key: 'totalStudents', width: 16 },
    { header: 'Presentes Hoje', key: 'presentsToday', width: 16 },
    { header: 'Faltas Hoje', key: 'absentsToday', width: 14 },
    { header: 'Atrasos Hoje', key: 'latesToday', width: 14 },
    { header: 'Presenças no Mês', key: 'monthlyPresents', width: 18 },
    { header: 'Faltas no Mês', key: 'monthlyAbsences', width: 16 },
    { header: 'Atrasos no Mês', key: 'monthlyLates', width: 16 },
    { header: 'Taxa de Frequência', key: 'frequencyRate', width: 20 },
  ];

  classes.forEach((c) => {
    wsClasses.addRow({
      className: c.className,
      teacherName: c.teacherName,
      room: c.room,
      totalStudents: c.totalStudents,
      presentsToday: c.presentsToday,
      absentsToday: c.absentsToday,
      latesToday: c.latesToday,
      monthlyPresents: c.monthlyPresents,
      monthlyAbsences: c.monthlyAbsences,
      monthlyLates: c.monthlyLates,
      frequencyRate: `${c.frequencyRate}%`,
    });
  });

  const classHeaderRow = wsClasses.getRow(1);
  classHeaderRow.height = 24;
  classHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsClasses.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = BORDER_THIN;
      });
    }
  });

  // 3. Detalhamento por Aluno
  const wsStudents = workbook.addWorksheet('Alunos Detalhe');
  wsStudents.views = [{ showGridLines: true }];
  wsStudents.columns = [
    { header: 'Matrícula', key: 'matricula', width: 18 },
    { header: 'Nome do Aluno', key: 'name', width: 28 },
    { header: 'Turma', key: 'className', width: 20 },
    { header: 'Status Hoje', key: 'status', width: 16 },
    { header: 'Última Entrada', key: 'lastEntryTime', width: 16 },
    { header: 'Encarregado de Educação', key: 'parentName', width: 26 },
    { header: 'Contacto', key: 'parentPhone', width: 18 },
    { header: 'E-mail', key: 'parentEmail', width: 28 },
    { header: 'Código Biométrico', key: 'biometricCode', width: 22 },
    { header: 'Apólice de Seguro', key: 'insurancePolicyId', width: 24 },
  ];

  students.forEach((s) => {
    wsStudents.addRow({
      matricula: s.matricula,
      name: s.name,
      className: s.className,
      status: s.status === 'present' ? 'Presente' : s.status === 'late' ? 'Atraso' : 'Falta',
      lastEntryTime: s.lastEntryTime || '--:--',
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      parentEmail: s.parentEmail,
      biometricCode: s.biometricCode,
      insurancePolicyId: s.insurancePolicyId,
    });
  });

  const studentsHeaderRow = wsStudents.getRow(1);
  studentsHeaderRow.height = 24;
  studentsHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsStudents.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = BORDER_THIN;
      });
    }
  });

  // 4. Logs Biométricos
  const wsLogs = workbook.addWorksheet('Leituras Biométricas');
  wsLogs.views = [{ showGridLines: true }];
  wsLogs.columns = [
    { header: 'Código Comprovante', key: 'receiptCode', width: 22 },
    { header: 'Aluno', key: 'studentName', width: 26 },
    { header: 'Turma', key: 'className', width: 18 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Horário', key: 'timestamp', width: 14 },
    { header: 'Data', key: 'date', width: 16 },
    { header: 'Local', key: 'location', width: 22 },
    { header: 'Método', key: 'method', width: 24 },
    { header: 'Notificação ao Pai', key: 'statusNote', width: 22 },
  ];

  logs.forEach((l) => {
    wsLogs.addRow({
      receiptCode: l.receiptCode,
      studentName: l.studentName,
      className: l.className,
      type: l.type === 'entry' ? 'Entrada' : 'Saída',
      timestamp: l.timestamp,
      date: l.date,
      location: l.location,
      method: l.method === 'facial' ? 'Reconhecimento Facial' : l.method === 'fingerprint' ? 'Biometria Digital' : 'Manual',
      statusNote: l.statusNote || 'Enviada',
    });
  });

  const logsHeaderRow = wsLogs.getRow(1);
  logsHeaderRow.height = 24;
  logsHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsLogs.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = BORDER_THIN;
      });
    }
  });

  // Download File
  await saveWorkbook(workbook, `AloMae_Relatorio_Geral_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export const exportGeneralExcel = async (
  classes: ClassAttendanceStat[],
  students: Student[],
  logs: AccessLog[] = []
) => {
  return exportGeneralAttendanceExcel(students, classes, logs);
};

export async function exportClassExcel(classStat: ClassAttendanceStat, studentsInClass: Student[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Alô Mãe - Sistema Escolar Inteligente';
  workbook.created = new Date();

  const sheetName = (classStat.className || 'Turma').slice(0, 31);
  const ws = workbook.addWorksheet(sheetName);
  ws.views = [{ showGridLines: true }];

  ws.addRow([`RELATÓRIO DA TURMA: ${classStat.className.toUpperCase()} — ALÔ MÃE`]);
  ws.addRow(['Professor:', classStat.teacherName]);
  ws.addRow(['Sala:', classStat.room]);
  ws.addRow(['Taxa de Frequência:', `${classStat.frequencyRate}%`]);
  ws.addRow(['Data de Emissão:', new Date().toLocaleDateString('pt-PT')]);
  ws.addRow([]);

  const titleRow = ws.getRow(1);
  titleRow.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF143A7B' } };

  const tableHeaderRowIndex = 7;
  const headerRow = ws.getRow(tableHeaderRowIndex);
  headerRow.values = ['MATRÍCULA', 'NOME DO ALUNO', 'STATUS HOJE', 'HORA ENTRADA', 'ENCARREGADO', 'TELEFONE'];
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  studentsInClass.forEach((s) => {
    ws.addRow([
      s.matricula,
      s.name,
      s.status === 'present' ? 'Presente' : s.status === 'late' ? 'Atraso' : 'Falta',
      s.lastEntryTime || '--:--',
      s.parentName || '--',
      s.parentPhone || '--',
    ]);
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber >= tableHeaderRowIndex) {
      row.eachCell((cell) => {
        cell.border = BORDER_THIN;
      });
    }
  });

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 26;
  ws.getColumn(6).width = 18;

  await saveWorkbook(workbook, `AloMae_Turma_${classStat.className.replace(/\s+/g, '_')}.xlsx`);
}
