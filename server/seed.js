const User = require('./models/User');

// Ensures the default admin account exists and stays updated on server boot.
async function seedAdmin() {
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'bryan123';

  let admin = await User.findOne({ email }) || await User.findOne({ role: 'admin' });

  if (admin) {
    admin.email = email;
    admin.password = password;
    admin.role = 'admin';
    await admin.save();
    console.log(`Admin account updated: ${email}`);
  } else {
    await User.create({
      name: 'Yuki (Admin)',
      email,
      password,
      role: 'admin',
    });
    console.log(`Admin account created: ${email}`);
  }
}

module.exports = seedAdmin;

