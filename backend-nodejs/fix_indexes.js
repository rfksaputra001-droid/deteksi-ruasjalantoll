require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('users');
  
  // Drop the wrong index
  try {
    await collection.dropIndex('email_1');
    console.log('✅ Dropped old index: email_1');
  } catch (err) {
    console.log('⚠️ Could not drop email_1:', err.message);
  }
  
  // List remaining indexes
  const indexes = await collection.indexes();
  console.log('\nRemaining indexes:');
  indexes.forEach(idx => {
    console.log('  -', idx.name, ':', JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
  });
  
  console.log('\n✅ Index fix complete! You can now add new users.');
  
  mongoose.disconnect();
});
