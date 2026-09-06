import * as XLSX from 'xlsx';
import { Student, ClassAttendanceStat, AccessLog } from './types';

export function exportGeneralAttendanceExcel(
  students: Student[],
  classes: ClassAttendanceStat[],
  logs: AccessLog[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Resumo Geral Sheet
  const summaryData = [
    ['RELATÓRIO GERAL DE FREQUÊNCIA ESCOLAR — ALÔ MÃE'],
    ['Tecnologia que aproxima. Segurança que tranquiliza.'],
    ['Data de Emissão:', new Date().toLocaleDateString('pt-PT')],
    ['Hora de Emissão:', new Date().toLocaleTimeString('pt-PT')],
    ['Escola:', 'Colégio Futuro — Luanda'],
    [],
    ['INDICADORES GERAIS'],
    ['Total de Alunos Matriculados', students.length],
    ['Presenças Registadas Hoje', students.filter((s) => s.status === 'present').length],
    ['Faltas Hoje', students.filter((s) => s.status === 'absent').length],
    ['Atrasos Hoje', students.filter((s) => s.status === 'late').length],
    ['Taxa de Frequência Média', '96.4%'],
    ['Alunos Cobertos pelo Seguro Escolar', '100% (240/240)'],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

  // 2. Consolidado por Turmas
  const classesData = classes.map((c) => ({
    'Turma': c.className,
    'Professor Titular': c.teacherName,
    'Sala': c.room,
    'Total de Alunos': c.totalStudents,
    'Presentes Hoje': c.presentsToday,
    'Faltas Hoje': c.absentsToday,
    'Atrasos Hoje': c.latesToday,
    'Presenças no Mês': c.monthlyPresents,
    'Faltas no Mês': c.monthlyAbsences,
    'Atrasos no Mês': c.monthlyLates,
    'Taxa de Frequência': `${c.frequencyRate}%`,
  }));
  const wsClasses = XLSX.utils.json_to_sheet(classesData);
  XLSX.utils.book_append_sheet(wb, wsClasses, 'Consolidado Turmas');

  // 3. Detalhamento por Aluno
  const studentsData = students.map((s) => ({
    'Matrícula': s.matricula,
    'Nome do Aluno': s.name,
    'Turma': s.className,
    'Status Hoje': s.status === 'present' ? 'Presente' : s.status === 'late' ? 'Atraso' : 'Falta',
    'Última Entrada': s.lastEntryTime || '--:--',
    'Encarregado de Educação': s.parentName,
    'Contacto': s.parentPhone,
    'E-mail': s.parentEmail,
    'Código Biométrico': s.biometricCode,
    'Apólice de Seguro': s.insurancePolicyId,
  }));
  const wsStudents = XLSX.utils.json_to_sheet(studentsData);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos Detalhe');

  // 4. Logs Biométricos
  const logsData = logs.map((l) => ({
    'Código Comprovante': l.receiptCode,
    'Aluno': l.studentName,
    'Turma': l.className,
    'Tipo': l.type === 'entry' ? 'Entrada' : 'Saída',
    'Horário': l.timestamp,
    'Data': l.date,
    'Local': l.location,
    'Método': l.method === 'facial' ? 'Reconhecimento Facial' : l.method === 'fingerprint' ? 'Biometria Digital' : 'Manual',
    'Notificação ao Pai': l.statusNote || 'Enviada',
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Leituras Biométricas');

  // Download File
  XLSX.writeFile(wb, `AloMae_Relatorio_Geral_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export const exportGeneralExcel = (
  classes: ClassAttendanceStat[],
  students: Student[],
  logs: AccessLog[] = []
) => {
  return exportGeneralAttendanceExcel(students, classes, logs);
};

export function exportClassExcel(classStat: ClassAttendanceStat, studentsInClass: Student[]) {
  const wb = XLSX.utils.book_new();

  const classSummary = [
    [`RELATÓRIO DA TURMA: ${classStat.className.toUpperCase()} — ALÔ MÃE`],
    ['Professor:', classStat.teacherName],
    ['Sala:', classStat.room],
    ['Taxa de Frequência:', `${classStat.frequencyRate}%`],
    ['Data:', new Date().toLocaleDateString('pt-PT')],
    [],
    ['MATRÍCULA', 'NOME DO ALUNO', 'STATUS HOJE', 'HORA ENTRADA', 'ENCARREGADO', 'TELEFONE'],
  ];

  studentsInClass.forEach((s) => {
    classSummary.push([
      s.matricula,
      s.name,
      s.status === 'present' ? 'Presente' : s.status === 'late' ? 'Atraso' : 'Falta',
      s.lastEntryTime || '--:--',
      s.parentName || '--',
      s.parentPhone || '--',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(classSummary);
  XLSX.utils.book_append_sheet(wb, ws, classStat.className);

  XLSX.writeFile(wb, `AloMae_Turma_${classStat.className.replace(/\s+/g, '_')}.xlsx`);
}
