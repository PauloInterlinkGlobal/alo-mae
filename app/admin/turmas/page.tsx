import { redirect } from 'next/navigation';

export default function TurmasRedirect() {
  redirect('/admin/gestao?tab=turmas');
}
