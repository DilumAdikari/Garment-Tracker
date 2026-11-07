import MasterCrud from '../components/MasterCrud';
import { formatNumber } from '../utils/format';

const COLUMNS = [
  { key: 'jobSheetNumber', label: 'Job sheet no.', render: (d) => <span className="font-mono font-medium text-slate-900">{d.jobSheetNumber}</span> },
  { key: 'style', label: 'Style', render: (d) => d.style?.styleNumber || '—' },
  { key: 'color', label: 'Color' },
  { key: 'targetQuantity', label: 'Target (pcs)', render: (d) => formatNumber(d.targetQuantity) },
  { key: 'isClosed', label: 'State', render: (d) => (d.isClosed ? 'Closed' : 'Open') },
];

const FIELDS = [
  { name: 'jobSheetNumber', label: 'Job sheet number', required: true },
  { name: 'style', label: 'Style', type: 'select', required: true, optionsUrl: '/styles', optionLabel: (s) => s.styleNumber },
  { name: 'color', label: 'Color' },
  { name: 'targetQuantity', label: 'Target quantity (pcs)', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'isClosed', label: 'Closed', type: 'checkbox' },
];

export default function JobSheetsPage() {
  return (
    <MasterCrud
      title="Job sheets"
      subtitle="Production orders linked to a style"
      singular="Job sheet"
      endpoint="/job-sheets"
      columns={COLUMNS}
      fields={FIELDS}
      emptyValues={{ isClosed: false, targetQuantity: 0 }}
      canDelete
    />
  );
}
