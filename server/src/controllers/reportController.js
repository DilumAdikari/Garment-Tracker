const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Issue = require('../models/Issue');
const DailyProduction = require('../models/DailyProduction');
const logActivity = require('../utils/activityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter } = require('../utils/dateRange');

/**
 * Report rows: one per issue, with issued / completed / pending for the selected
 * issue date range, optionally narrowed to a plant or style.
 */
async function buildIssueRows(query) {
  const filter = { ...(buildDateFilter(query, 'issueDate') || {}) };
  if (query.plant) filter.plant = query.plant;
  if (query.style) filter.style = query.style;

  const issues = await Issue.find(filter)
    .populate('style', 'styleNumber')
    .populate('jobSheet', 'jobSheetNumber')
    .populate('plant', 'name')
    .sort({ issueDate: 1, issueNumber: 1 });

  return issues.map((i) => ({
    issueNumber: i.issueNumber,
    issueDate: i.issueDate.toISOString().slice(0, 10),
    plant: i.plant?.name || '',
    style: i.style?.styleNumber || '',
    jobSheet: i.jobSheet?.jobSheetNumber || '',
    issued: i.issuedQuantity,
    completed: i.completedQuantity,
    pending: Math.max(i.issuedQuantity - i.completedQuantity, 0),
    status: i.status,
  }));
}

/** Daily production rows for the production date range. */
async function buildProductionRows(query) {
  const filter = { isDeleted: false, ...(buildDateFilter(query, 'date') || {}) };
  if (query.plant) filter.plant = query.plant;
  if (query.style) filter.style = query.style;

  const entries = await DailyProduction.find(filter)
    .populate('plant', 'name')
    .populate('style', 'styleNumber')
    .populate('jobSheet', 'jobSheetNumber')
    .sort({ date: 1 });

  return entries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    plant: e.plant?.name || '',
    style: e.style?.styleNumber || '',
    jobSheet: e.jobSheet?.jobSheetNumber || '',
    completed: e.completedQuantity,
    sentOut: e.sentOutQuantity,
  }));
}

const REPORTS = {
  issues: {
    title: 'Issued vs Completed',
    columns: [
      { header: 'Issue No', key: 'issueNumber', width: 14 },
      { header: 'Issue Date', key: 'issueDate', width: 12 },
      { header: 'Plant', key: 'plant', width: 22 },
      { header: 'Style', key: 'style', width: 14 },
      { header: 'Job Sheet', key: 'jobSheet', width: 14 },
      { header: 'Issued', key: 'issued', width: 10 },
      { header: 'Completed', key: 'completed', width: 12 },
      { header: 'Pending', key: 'pending', width: 10 },
      { header: 'Status', key: 'status', width: 14 },
    ],
    build: buildIssueRows,
    totals: ['issued', 'completed', 'pending'],
  },
  production: {
    title: 'Daily Production',
    columns: [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Plant', key: 'plant', width: 22 },
      { header: 'Style', key: 'style', width: 14 },
      { header: 'Job Sheet', key: 'jobSheet', width: 14 },
      { header: 'Completed', key: 'completed', width: 12 },
      { header: 'Sent Out', key: 'sentOut', width: 12 },
    ],
    build: buildProductionRows,
    totals: ['completed', 'sentOut'],
  },
};

function resolveReport(req) {
  const report = REPORTS[req.params.type];
  if (!report) {
    const err = new Error('Unknown report type. Use "issues" or "production".');
    err.statusCode = 400;
    throw err;
  }
  return report;
}

/** GET /api/reports/:type?from=&to=&plant=&style= — JSON for on-screen tables. */
exports.json = asyncHandler(async (req, res) => {
  const report = resolveReport(req);
  const rows = await report.build(req.query);
  const totals = {};
  report.totals.forEach((k) => (totals[k] = rows.reduce((s, r) => s + (r[k] || 0), 0)));
  res.json({ title: report.title, rows, totals, count: rows.length });
});

/** GET /api/reports/:type/excel */
exports.excel = asyncHandler(async (req, res) => {
  const report = resolveReport(req);
  const rows = await report.build(req.query);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Garment Production Tracker';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(report.title);

  sheet.columns = report.columns;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  rows.forEach((r) => sheet.addRow(r));

  if (rows.length) {
    const totalRow = sheet.addRow(
      Object.fromEntries(report.columns.map((c) => [c.key, report.totals.includes(c.key) ? { formula: `SUM(${colLetter(report.columns, c.key)}2:${colLetter(report.columns, c.key)}${rows.length + 1})` } : c === report.columns[0] ? 'TOTAL' : '']))
    );
    totalRow.font = { bold: true };
  }

  await logActivity(req, { action: 'EXPORT', entity: 'Report', description: `Exported ${report.title} to Excel`, meta: req.query });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

/** GET /api/reports/:type/pdf */
exports.pdf = asyncHandler(async (req, res) => {
  const report = resolveReport(req);
  const rows = await report.build(req.query);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-report.pdf"`);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  doc.pipe(res);

  doc.fontSize(16).text(report.title, { align: 'left' });
  const { from, to } = req.query;
  doc.fontSize(9).fillColor('#555').text(`Period: ${from || 'start'} to ${to || 'today'}   |   Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(0.8);

  const widths = report.columns.map((c) => c.width * 6.2);
  const drawRow = (values, y, bold = false, fill = null) => {
    let x = doc.page.margins.left;
    if (fill) doc.rect(doc.page.margins.left, y - 3, widths.reduce((a, b) => a + b, 0), 16).fill(fill);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(fill === '#1E3A5F' ? '#fff' : '#111');
    values.forEach((v, i) => {
      doc.text(String(v ?? ''), x + 3, y, { width: widths[i] - 6, lineBreak: false });
      x += widths[i];
    });
  };

  let y = doc.y;
  drawRow(report.columns.map((c) => c.header), y, true, '#1E3A5F');
  y += 18;

  rows.forEach((r, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      drawRow(report.columns.map((c) => c.header), y, true, '#1E3A5F');
      y += 18;
    }
    if (idx % 2 === 1) doc.rect(doc.page.margins.left, y - 3, widths.reduce((a, b) => a + b, 0), 16).fill('#F3F6FA');
    drawRow(report.columns.map((c) => r[c.key]), y, false);
    y += 16;
  });

  if (rows.length) {
    y += 6;
    const totalValues = report.columns.map((c, i) =>
      i === 0 ? 'TOTAL' : report.totals.includes(c.key) ? rows.reduce((s, r) => s + (r[c.key] || 0), 0) : ''
    );
    drawRow(totalValues, y, true);
  } else {
    doc.text('No records found for the selected filters.', doc.page.margins.left, y + 10);
  }

  doc.end();
  await logActivity(req, { action: 'EXPORT', entity: 'Report', description: `Exported ${report.title} to PDF`, meta: req.query });
});

function colLetter(columns, key) {
  const idx = columns.findIndex((c) => c.key === key);
  return String.fromCharCode(65 + idx);
}
