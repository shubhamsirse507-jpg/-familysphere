/**
 * Test script: Add dummy memories via API for all 3 source types
 */
const BASE = 'http://localhost:5000/api';

// A public test image URL (small PNG from Unsplash)
const DUMMY_IMAGE_URL = 'https://picsum.photos/seed/familysphere/400/300';
// A dummy Google Drive URL (public image embed)
const DUMMY_GDRIVE_URL = 'https://drive.google.com/file/d/1bGxHqkT7gBrX6xKyO8V3dYQGtVwLRq_e/view?usp=sharing';

async function run() {
  console.log('🧪 FamilySphere — Memory Feature Test\n');

  // Step 1: Login
  console.log('Step 1: Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Shubham@family.com', password: 'Shubham@1942' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('❌ Login failed:', JSON.stringify(loginData));
    process.exit(1);
  }
  console.log(`✅ Logged in as: ${loginData.name} (${loginData.role})\n`);

  // Step 2: Test External URL option
  console.log('Step 2: Testing 🌐 External URL option...');
  const extRes = await fetch(`${BASE}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Test External URL Memory 📸',
      description: 'Dummy image added via External URL option for testing.',
      mediaUrl: DUMMY_IMAGE_URL,
      sourceType: 'url'
    })
  });
  const extData = await extRes.json();
  console.log(`   HTTP ${extRes.status} →`, extRes.ok ? `✅ Created! ID: ${extData.id}, Title: "${extData.title}"` : `❌ Error: ${JSON.stringify(extData)}`);
  const extMemoryId = extData.id;

  // Step 3: Test Google Drive option
  console.log('\nStep 3: Testing 🔗 Google Drive option...');
  const driveRes = await fetch(`${BASE}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Test Google Drive Memory 🔗',
      description: 'Dummy image added via Google Drive link option for testing.',
      mediaUrl: DUMMY_GDRIVE_URL,
      sourceType: 'googledrive'
    })
  });
  const driveData = await driveRes.json();
  console.log(`   HTTP ${driveRes.status} →`, driveRes.ok ? `✅ Created! ID: ${driveData.id}, Title: "${driveData.title}"` : `❌ Error: ${JSON.stringify(driveData)}`);
  const driveMemoryId = driveData.id;

  // Step 4: List all memories
  console.log('\nStep 4: Fetching all memories...');
  const listRes = await fetch(`${BASE}/memories`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const memories = await listRes.json();
  console.log(`   HTTP ${listRes.status} → Found ${memories.length} total memories`);
  memories.forEach((m, i) => {
    console.log(`   ${i + 1}. [${m.sourceType}] "${m.title}" — ${m.mediaUrl?.substring(0, 60)}...`);
  });

  console.log('\n📋 Summary:');
  console.log('   📁 Local File Upload → requires browser interaction (tested via UI)');
  console.log(`   🌐 External URL      → ${extRes.ok ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   🔗 Google Drive      → ${driveRes.ok ? '✅ PASSED' : '❌ FAILED'}`);

  // Cleanup: delete the test memories we created
  console.log('\nStep 5: Cleaning up test memories...');
  if (extMemoryId) {
    const d1 = await fetch(`${BASE}/memories/${extMemoryId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    console.log(`   Deleted External URL memory → HTTP ${d1.status}`);
  }
  if (driveMemoryId) {
    const d2 = await fetch(`${BASE}/memories/${driveMemoryId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    console.log(`   Deleted Google Drive memory → HTTP ${d2.status}`);
  }

  console.log('\n🎉 Memory feature API test complete!');
}

run().catch(e => { console.error('❌ Test error:', e.message); process.exit(1); });
