// Fix user school reference
require('./config/env');
const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');

const fixUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/schoolpay');
    console.log('✅ Connected to MongoDB\n');

    // Get the first school (you can change this)
    const school = await School.findOne();
    console.log('📚 Found school:', school.name);

    // Update the user
    const result = await User.updateMany(
      { email: 'admin@schoolpay.com' },
      { $set: { school: school._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} user(s)`);
    
    // Verify
    const user = await User.findOne({ email: 'admin@schoolpay.com' });
    console.log('\n👤 User now has school:', user.school);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixUser();
