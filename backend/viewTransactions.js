const mongoose = require('mongoose');
require('./config/env');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/schoolpay', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Transaction = require('./models/Transaction');
const Student = require('./models/Student');
const School = require('./models/School');

async function viewData() {
  try {
    console.log('\n========== MONGODB DATA VIEWER ==========\n');
    
    // Get all schools
    const schools = await School.find({});
    console.log('📚 SCHOOLS:');
    schools.forEach(school => {
      console.log(`  - ${school.name} (ID: ${school._id})`);
    });
    console.log('');
    
    // Get all students
    const students = await Student.find({}).populate('school', 'name');
    console.log('👨‍🎓 STUDENTS:');
    students.forEach(student => {
      console.log(`  - ${student.name} (${student.admissionNumber}) - School: ${student.school?.name || 'N/A'}`);
      console.log(`    Balance: KES ${student.currentBalance}`);
    });
    console.log('');
    
    // Get all transactions
    const transactions = await Transaction.find({})
      .populate('student', 'name admissionNumber')
      .populate('school', 'name')
      .sort({ createdAt: -1 });
      
    console.log('💰 TRANSACTIONS:');
    if (transactions.length === 0) {
      console.log('  No transactions found.');
    } else {
      transactions.forEach(txn => {
        console.log(`\n  Transaction ID: ${txn.transactionId}`);
        console.log(`  Amount: KES ${txn.amount}`);
        console.log(`  Source: ${txn.source}`);
        console.log(`  Status: ${txn.status}`);
        console.log(`  Paid By: ${txn.paidBy}`);
        console.log(`  Reference: ${txn.reference}`);
        console.log(`  Student: ${txn.student?.name || 'Unknown'} (${txn.student?.admissionNumber || 'N/A'})`);
        console.log(`  School: ${txn.school?.name || 'Suspense Account (No School)'}`);
        console.log(`  Phone: ${txn.phoneNumber || 'N/A'}`);
        console.log(`  Created: ${txn.createdAt}`);
      });
    }
    
    console.log('\n=========================================\n');
    
    // Summary
    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED').length;
    const pendingTransactions = transactions.filter(t => t.status === 'PENDING').length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const mpesaTransactions = transactions.filter(t => t.source === 'MPESA').length;
    
    console.log('📊 SUMMARY:');
    console.log(`  Total Transactions: ${totalTransactions}`);
    console.log(`  Completed: ${completedTransactions}`);
    console.log(`  Pending (Suspense): ${pendingTransactions}`);
    console.log(`  Total Amount: KES ${totalAmount.toLocaleString()}`);
    console.log(`  M-PESA Transactions: ${mpesaTransactions}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

viewData();
