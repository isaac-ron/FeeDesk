// Seed test data for dashboard demo
require('./config/env');
const mongoose = require('mongoose');
const School = require('./models/School');
const Student = require('./models/Student');
const User = require('./models/User');

const seedTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/schoolpay');
    console.log('✅ Connected to MongoDB');

    // Create a demo school
    let school = await School.findOne({ code: 'DEMO001' });
    if (!school) {
      school = await School.create({
        name: 'Demo High School',
        code: 'DEMO001',
        contactEmail: 'admin@demo.com',
        contactPhone: '254700000001',
        paybillNumber: '600966',
        address: {
          street: '123 School Road',
          city: 'Nairobi',
          county: 'Nairobi',
          postalCode: '00100'
        },
        maxStudents: 1000
      });
      console.log('✅ Created demo school:', school.name);
    } else {
      console.log('✅ Demo school already exists');
    }

    // Create demo students
    const students = [
      {
        school: school._id,
        admissionNumber: 'STU001',
        name: 'John Doe Smith',
        classLevel: 'Grade 12',
        stream: 'East',
        currentBalance: 15000,
        guardianName: 'Mr. Smith',
        guardianPhone: '254712345678',
        guardianEmail: 'parent1@email.com',
        status: 'Active'
      },
      {
        school: school._id,
        admissionNumber: 'STU002',
        name: 'Jane Mary Wilson',
        classLevel: 'Grade 11',
        stream: 'West',
        currentBalance: 8000,
        guardianName: 'Mrs. Wilson',
        guardianPhone: '254723456789',
        guardianEmail: 'parent2@email.com',
        status: 'Active'
      },
      {
        school: school._id,
        admissionNumber: 'ADM001',
        name: 'Nicholas Kimani',
        classLevel: 'Grade 10',
        stream: 'North',
        currentBalance: 20000,
        guardianName: 'Mr. Kimani',
        guardianPhone: '254734567890',
        guardianEmail: 'parent3@email.com',
        status: 'Active'
      }
    ];

    for (const studentData of students) {
      const existing = await Student.findOne({ 
        school: school._id, 
        admissionNumber: studentData.admissionNumber 
      });
      
      if (!existing) {
        await Student.create(studentData);
        console.log(`✅ Created student: ${studentData.name} (${studentData.admissionNumber})`);
      } else {
        console.log(`✅ Student already exists: ${studentData.admissionNumber}`);
      }
    }

    // Create a demo user for login
    let user = await User.findOne({ email: 'admin@demo.com' });
    if (!user) {
      user = await User.create({
        school: school._id,
        name: 'Demo Admin',
        email: 'admin@demo.com',
        password: 'demo123', // Will be hashed by the model
        role: 'admin',
        phone: '254700000000'
      });
      console.log('✅ Created demo user: admin@demo.com / demo123');
    } else {
      console.log('✅ Demo user already exists');
    }

    console.log('\n🎉 Test data seeded successfully!');
    console.log('\n📊 You can now:');
    console.log('1. Login to the dashboard with: admin@demo.com / demo123');
    console.log('2. Send test payments using admission numbers: STU001, STU002, ADM001');
    console.log('3. Watch the dashboard update in real-time!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedTestData();
