require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('users');
  
  // List all indexes
  const indexes = await collection.indexes();
  console.log('\nCurrent indexes on users collection:');
  indexes.forEach(idx => {
    console.log('  -', idx.name, ':', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
  });
  
  // Check for duplicate emails
  const pipeline = [
    { $group: { _id: { $toLower: '$emailUser' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ];
  
  console.log('\nChecking for duplicate emails...');
  const duplicates = await collection.aggregate(pipeline).toArray();
  
  if (duplicates.length > 0) {
    console.log('Found duplicate emails:');
    duplicates.forEach(d => console.log('  -', d._id, ':', d.count, 'records'));
  } else {
    console.log('No duplicate emails found');
  }
  
  // List all users
  console.log('\nAll users:');
  const users = await collection.find({}).project({ emailUser: 1, namaUser: 1 }).toArray();
  users.forEach(u => console.log('  -', u._id.toString(), ':', u.emailUser, '(', u.namaUser, ')'));
  
  mongoose.disconnect();
});
