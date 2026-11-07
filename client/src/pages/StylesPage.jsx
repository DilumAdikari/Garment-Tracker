import MasterCrud from '../components/MasterCrud';

const COLUMNS = [
  { key: 'styleNumber', label: 'Style no.', render: (d) => <span className="font-mono font-medium text-slate-900">{d.styleNumber}</span> },
  { key: 'description', label: 'Description' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'season', label: 'Season' },
];

const FIELDS = [
  { name: 'styleNumber', label: 'Style number', required: true },
  { name: 'season', label: 'Season' },
  { name: 'description', label: 'Description', span: 2 },
  { name: 'buyer', label: 'Buyer', span: 2 },
  { name: 'isActive', label: 'Active', type: 'checkbox', span: 2 },
];

export default function StylesPage() {
  return (
    <MasterCrud
      title="Styles"
      subtitle="Garment styles produced for buyers"
      singular="Style"
      endpoint="/styles"
      columns={COLUMNS}
      fields={FIELDS}
      emptyValues={{ isActive: true }}
      canDelete
    />
  );
}
