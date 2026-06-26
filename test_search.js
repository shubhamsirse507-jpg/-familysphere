import { User } from './backend/src/models/index.js';
import { Op } from 'sequelize';

async function test() {
  try {
    // Load Host2 by phone
    let host2 = await User.findOne({ where: { phone: '3158390681' } });
    if (!host2) {
      console.log('Host2 not found in database');
      return;
    }

    // Find or create Jaduu
    let jaduu = await User.findOne({ where: { email: 'jaduu@family.com' } });
    if (!jaduu) {
      jaduu = await User.create({
        name: 'Jaduu',
        email: 'jaduu@family.com',
        phone: '9876543210',
        passwordHash: 'hashed_password',
        role: 'Parent',
        familyId: null
      });
    }

    console.log('Host2 ID:', host2.id);
    console.log('Jaduu ID:', jaduu.id);

    // Simulate search logic
    const req = {
      query: { query: 'jaduu@family.com' },
      user: {
        id: host2.id,
        email: host2.email,
        familyId: host2.familyId
      }
    };

    const q = req.query.query.trim().toLowerCase();
    const found = await User.findOne({
      where: {
        [Op.or]: [
          { email: q },
          { phone: q }
        ]
      }
    });

    if (!found) {
      console.log('User not found in test search');
      return;
    }

    const myFamilyId = req.user.familyId;
    const theirFamilyId = found.familyId;

    let status = 'can_invite';
    if (found.id === req.user.id) {
      status = 'self';
    } else if (theirFamilyId && theirFamilyId === myFamilyId) {
      status = 'already_in_family';
    } else if (theirFamilyId && theirFamilyId !== myFamilyId) {
      status = 'in_different_family';
    }

    console.log('Search Result User:', found.name, found.email);
    console.log('Comparison: found.id === req.user.id is', found.id === req.user.id);
    console.log('Status is:', status);

  } catch (err) {
    console.error(err);
  }
}

test();
