import { connectDB, sequelize } from './src/config/db.js';
import { User } from './src/models/index.js';
import speakeasy from 'speakeasy';

async function run() {
  await connectDB();
  
  const args = process.argv.slice(2);
  const action = args[0]; // '--disable', '--generate', or '--list'
  const targetEmail = args[1];

  if (!action || action === '--list') {
    const users = await User.findAll();
    console.log('\n=== FamilySphere User Accounts & 2FA Status ===');
    users.forEach(user => {
      console.log(`\nName: ${user.name}`);
      console.log(`Email: ${user.email}`);
      if (user.twoFactorSecret) {
        console.log(`2FA Status: ENABLED (Secret: ${user.twoFactorSecret})`);
        const token = speakeasy.totp({
          secret: user.twoFactorSecret,
          encoding: 'base32'
        });
        console.log(`--> Current OTP Code: ${token}`);
      } else {
        console.log('2FA Status: DISABLED');
      }
    });
    console.log('\n================================================');
  } else if (action === '--disable' && targetEmail) {
    const user = await User.findOne({ where: { email: targetEmail } });
    if (!user) {
      console.error(`User with email "${targetEmail}" not found.`);
    } else {
      user.twoFactorSecret = null;
      await user.save();
      console.log(`\n✅ Success: 2FA has been disabled for ${user.name} (${user.email}).`);
    }
  } else if (action === '--generate' && targetEmail) {
    const user = await User.findOne({ where: { email: targetEmail } });
    if (!user) {
      console.error(`User with email "${targetEmail}" not found.`);
    } else if (!user.twoFactorSecret) {
      console.log(`2FA is not enabled for ${user.name}.`);
    } else {
      const token = speakeasy.totp({
        secret: user.twoFactorSecret,
        encoding: 'base32'
      });
      console.log(`\n--> Current OTP Code for ${user.name}: ${token}`);
    }
  } else {
    console.log('Usage:\n  node manage_2fa.js --list\n  node manage_2fa.js --disable <email>\n  node manage_2fa.js --generate <email>');
  }

  await sequelize.close();
}

run().catch(console.error);
