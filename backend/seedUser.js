const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('./config/env');

// Import models
const User = require('./models/User');
const School = require('./models/School');

// Seed function
const seedDefaultData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/schoolpay');
    console.log('MongoDB Connected...');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ email: 'superadmin@schoolpay.com' });
    if (existingSuperAdmin) {
      console.log('Super Admin already exists!');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);

      // Create super admin (no school required)
      await User.create({
        name: 'Super Administrator',
        email: 'superadmin@schoolpay.com',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true
      });

      console.log('✅ Super Admin created successfully!');
      console.log('Email: superadmin@schoolpay.com');
      console.log('Password: SuperAdmin@123');
      console.log('=====================================');
    }

    // Create a demo school
    let demoSchool = await School.findOne({ code: 'DEMO001' });
    
    if (!demoSchool) {
      demoSchool = await School.create({
        name: 'Demo Secondary School',
        code: 'DEMO001',
        paybillNumber: '123456',
        accountNumber: 'DEMO',
        contactEmail: 'info@demoschool.ac.ke',
        contactPhone: '254712345678',
        address: {
          street: '123 Education Lane',
          city: 'Nairobi',
          county: 'Nairobi',
          postalCode: '00100'
        },
        bankDetails: {
          bankName: 'Kenya Commercial Bank',
          accountName: 'Demo Secondary School',
          accountNumber: '1234567890',
          branch: 'Nairobi Branch'
        },
        isActive: true,
        subscriptionStatus: 'ACTIVE',
        maxStudents: 1000
      });

      console.log('✅ Demo School created successfully!');
      console.log(`School Code: ${demoSchool.code}`);
      console.log(`School Name: ${demoSchool.name}`);
      console.log('=====================================');
    } else {
      console.log('Demo School already exists!');
    }

    // Create school admin for demo school
    const existingSchoolAdmin = await User.findOne({ email: 'admin@demoschool.ac.ke' });
    
    if (!existingSchoolAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin@123', salt);

      await User.create({
        name: 'School Administrator',
        email: 'admin@demoschool.ac.ke',
        password: hashedPassword,
        role: 'admin',
        school: demoSchool._id,
        isActive: true
      });

      console.log('✅ School Admin created successfully!');
      console.log('Email: admin@demoschool.ac.ke');
      console.log('Password: Admin@123');
      console.log('=====================================');
    } else {
      console.log('School Admin already exists!');
    }

    // Create bursar for demo school
    const existingBursar = await User.findOne({ email: 'bursar@demoschool.ac.ke' });
    
    if (!existingBursar) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Bursar@123', salt);

      await User.create({
        name: 'School Bursar',
        email: 'bursar@demoschool.ac.ke',
        password: hashedPassword,
        role: 'bursar',
        school: demoSchool._id,
        isActive: true
      });

      console.log('✅ School Bursar created successfully!');
      console.log('Email: bursar@demoschool.ac.ke');
      console.log('Password: Bursar@123');
      console.log('=====================================');
    } else {
      console.log('School Bursar already exists!');
    }

    console.log('\n📋 Summary of Accounts:');
    console.log('=====================================');
    console.log('1. Super Admin (Full System Access):');
    console.log('   Email: superadmin@schoolpay.com');
    console.log('   Password: SuperAdmin@123');
    console.log('');
    console.log('2. School Admin (Demo School):');
    console.log('   Email: admin@demoschool.ac.ke');
    console.log('   Password: Admin@123');
    console.log('');
    console.log('3. School Bursar (Demo School):');
    console.log('   Email: bursar@demoschool.ac.ke');
    console.log('   Password: Bursar@123');
    console.log('=====================================');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedDefaultData();
