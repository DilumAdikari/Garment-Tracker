import MasterCrud from '../components/MasterCrud';

// Defined at module scope so the component's option-loading effect stays stable.
const COLUMNS = [
  { key: 'name', label: 'Plant name', render: (d) => <span className="font-medium text-slate-900">{d.name}</span> },
  { key: 'code', label: 'Code', render: (d) => <span className="font-mono text-xs">{d.code || '—'}</span> },
  { key: 'location', label: 'Location' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'contactPhone', label: 'Phone' },
];

const FIELDS = [
  { name: 'name', label: 'Plant name', required: true, span: 2 },
  { name: 'code', label: 'Code (e.g. PA)' },
  { name: 'location', label: 'Location' },
  { name: 'contactPerson', label: 'Contact person' },
  { name: 'contactPhone', label: 'Contact phone' },
  { name: 'isActive', label: 'Active', type: 'checkbox', span: 2 },
];

export default function PlantsPage() {
  return (
    <MasterCrud
      title="Plants"
      subtitle="Production plants that receive cut pieces"
      singular="Plant"
      endpoint="/plants"
      columns={COLUMNS}
      fields={FIELDS}
      emptyValues={{ isActive: true }}
      canDelete
    />
  );
}
