const mongoose = require('mongoose');
const School = require('./models/School');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
require('./config/env');

async function testMpesaFlow() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected\n');

    // 1. Create or find test school
    console.log('[1] Setting up test school...');
    let school = await School.findOne({ code: 'DEMO' });
    if (!school) {
      school = await School.create({
        name: 'Demo School',
        code: 'DEMO',
        paybillNumber: '600966',
        contactPhone: '254712345678',
        contactEmail: 'demo@school.com',
        address: {
          street: 'Test Street',
          city: 'Nairobi',
          county: 'Nairobi'
        },
        settings: {
          currency: 'KES',
          academicYear: '2024',
          termDates: {
            term1Start: new Date('2024-01-15'),
            term1End: new Date('2024-04-15')
          }
        },
        subscription: {
          plan: 'trial',
          status: 'active'
        }
      });
      console.log('✅ Created test school:', school.name);
    } else {
      console.log('✅ Found existing school:', school.name);
    }

    // 2. Create or find test student
    console.log('\n[2] Setting up test student...');
    let student = await Student.findOne({ admissionNumber: 'ADM001', school: school._id });
    if (!student) {
      student = await Student.create({
        school: school._id,
        admissionNumber: 'ADM001',
        name: 'John Doe',
        classLevel: 'Grade 10',
        stream: 'A',
        guardianName: 'Jane Doe',
        guardianPhone: '254712345678',
        guardianEmail: 'parent@test.com',
        currentBalance: 10000 // KES 10,000 owed
      });
      console.log('✅ Created test student:', student.name);
    } else {
      console.log('✅ Found existing student:', student.name);
    }
    console.log('   Admission Number:', student.admissionNumber);
    console.log('   Current Balance: KES', student.currentBalance);

    // 3. Test transaction creation (simulating M-PESA callback)
    console.log('\n[3] Creating test transaction...');
    const testTransaction = await Transaction.create({
      school: school._id,
      transactionId: 'TEST_' + Date.now(),
      student: student._id,
      amount: 5000,
      source: 'MPESA',
      reference: 'ADM001',
      status: 'COMPLETED',
      paidBy: 'NICHOLAS TEST',
      phoneNumber: null, // Masked number - set to null
      metadata: {
        test: true,
        maskedMSISDN: '2547 ***** 126'
      }
    });
    console.log('✅ Transaction created:', testTransaction.transactionId);

    // 4. Update student balance
    console.log('\n[4] Updating student balance...');
    const oldBalance = student.currentBalance;
    student.currentBalance -= 5000;
    await student.save();
    console.log('   Old Balance: KES', oldBalance);
    console.log('   Payment: KES 5000');
    console.log('   New Balance: KES', student.currentBalance);

    // 5. Test suspense account transaction (no student)
    console.log('\n[5] Creating suspense transaction...');
    const suspenseTransaction = await Transaction.create({
      school: null, // No school for suspense
      transactionId: 'SUSPENSE_' + Date.now(),
      student: null, // No student found
      amount: 3000,
      source: 'MPESA',
      reference: 'ADM999', // Non-existent admission number
      status: 'PENDING',
      paidBy: 'UNKNOWN PARENT',
      phoneNumber: null,
      metadata: {
        test: true,
        note: 'Student not found - suspense account'
      }
    });
    console.log('✅ Suspense transaction created:', suspenseTransaction.transactionId);

    console.log('\n✅ All tests passed!');
    console.log('\nYou can now test the M-PESA endpoint with:');
    console.log('BillRefNumber: ADM001 (will match student)');
    console.log('BillRefNumber: ADM999 (will go to suspense)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

testMpesaFlow();
