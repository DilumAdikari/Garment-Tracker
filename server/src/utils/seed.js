/* Creates the first admin account and a few sample master records. Run: npm run seed */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Plant = require('../models/Plant');
const Style = require('../models/Style');
const JobSheet = require('../models/JobSheet');

(async () => {
  await connectDB();

  if (!(await User.exists({ role: 'admin' }))) {
    await User.create({ name: 'System Admin', username: 'admin', password: 'admin123', role: 'admin' });
    console.log('Created admin user  -> username: admin  password: admin123  (change this immediately)');
  }

  const plants = await Plant.insertMany(
    [
      { name: 'Plant A - Colombo', code: 'PA' },
      { name: 'Plant B - Kandy', code: 'PB' },
    ],
    { ordered: false }
  ).catch(() => []);

  const style = await Style.findOneAndUpdate(
    { styleNumber: 'ST-1001' },
    { styleNumber: 'ST-1001', description: 'Sample cotton shirt', buyer: 'Sample Buyer' },
    { upsert: true, new: true }
  );
  await JobSheet.findOneAndUpdate(
    { jobSheetNumber: 'JS-5001' },
    { jobSheetNumber: 'JS-5001', style: style._id, color: 'Navy', targetQuantity: 1000 },
    { upsert: true, new: true }
  );

  console.log(`Seed complete. Sample plants added: ${plants.length}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
