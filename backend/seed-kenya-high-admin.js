require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const School = require('./models/School');

const EMAIL = 'admin@kenyahigh.ac.ke';
const PASSWORD = 'Admin@123';
const NAME = 'Kenya High Administrator';
const SCHOOL_CODE = 'KHS';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');
  console.log('DB name:', mongoose.connection.name);
  console.log('Host:   ', mongoose.connection.host);
  console.log('School count:', await School.countDocuments());
  console.log('All school codes:', (await School.find({}, { code: 1, name: 1 })).map(s => `${s.code}=${s.name}`));

  const school = await School.findOne({ code: SCHOOL_CODE });
  if (!school) {
    console.error(`No school with code ${SCHOOL_CODE} in DB "${mongoose.connection.name}"`);
    process.exit(1);
  }
  console.log(`Target school: ${school.name} (${school._id})`);

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    console.log(`User ${EMAIL} already exists — nothing to do`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  await User.create({
    name: NAME,
    email: EMAIL,
    password: hash,
    role: 'admin',
    school: school._id,
    isActive: true,
  });

  console.log(`\nCreated admin user`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Change the password after first login.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
