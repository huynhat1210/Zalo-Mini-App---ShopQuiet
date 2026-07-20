const bcrypt = require('../apps/backend/node_modules/bcrypt');

// Generate bcrypt hash for admin password
const password = process.argv[2] || 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log('Password:', password);
  console.log('Bcrypt Hash:', hash);
  console.log('\nAdd this to your .env file:');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
});
