// Quick diagnostic to check what's in the database
require('./config/env');
const mongoose = require('mongoose');
const School = require('./models/School');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/schoolpay');
    console.log('✅ Connected to MongoDB\n');

    // Check schools
    const schools = await School.find();
    console.log('📚 SCHOOLS:', schools.length);
    schools.forEach(s => console.log(`  - ${s.name} (ID: ${s._id})`));

    // Check students
    const students = await Student.find();
    console.log('\n👥 STUDENTS:', students.length);
    students.forEach(s => console.log(`  - ${s.name} (${s.admissionNumber}) - School: ${s.school}`));

    // Check transactions
    const transactions = await Transaction.find();
    console.log('\n💰 TRANSACTIONS:', transactions.length);
    transactions.forEach(t => console.log(`  - ${t.transactionId}: ${t.amount} KES - Status: ${t.status} - School: ${t.school}`));

    // Check users
    const users = await User.find();
    console.log('\n👤 USERS:', users.length);
    users.forEach(u => console.log(`  - ${u.email} - School: ${u.school} - Role: ${u.role}`));

    // Check if school references match
    if (schools.length > 0 && students.length > 0) {
      const schoolId = schools[0]._id.toString();
      const studentSchoolId = students[0].school.toString();
      console.log('\n🔍 REFERENCE CHECK:');
      console.log(`  School ID: ${schoolId}`);
      console.log(`  Student School ID: ${studentSchoolId}`);
      console.log(`  Match: ${schoolId === studentSchoolId ? '✅' : '❌'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkData();
