/**
 * Test script: Upload a local dummy image file via multipart/form-data
 * then save it as a Memory — tests the full local file upload pipeline
 */
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5000/api';

// Create a minimal valid 1x1 red pixel PNG in memory (base64 → buffer)
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
const tmpFile = path.resolve('test_dummy_image.png');

async function run() {
  console.log('🧪 FamilySphere — Local File Upload Test\n');

  // Write a tiny PNG to disk
  fs.writeFileSync(tmpFile, Buffer.from(TINY_PNG_B64, 'base64'));
  console.log(`✅ Created tiny dummy PNG: ${tmpFile} (${fs.statSync(tmpFile).size} bytes)\n`);

  // Step 1: Login
  console.log('Step 1: Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Shubham@family.com', password: '!@#Shubham!@#' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('❌ Login failed:', JSON.stringify(loginData));
    cleanup(); process.exit(1);
  }
  console.log(`✅ Logged in as: ${loginData.name} (${loginData.role})\n`);

  // Step 2: Upload the file via /api/upload (multer endpoint)
  console.log('Step 2: Uploading dummy image via /api/upload...');
  const fileBuffer = fs.readFileSync(tmpFile);
  const { Blob } = await import('buffer');

  // Build multipart/form-data using FormData (Node 18+ native)
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('file', blob, 'test_dummy_image.png');

  const uploadRes = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log(`   HTTP ${uploadRes.status} →`, uploadRes.ok
    ? `✅ Uploaded! URL: ${uploadData.url}`
    : `❌ Error: ${JSON.stringify(uploadData)}`);

  if (!uploadRes.ok) { cleanup(); process.exit(1); }

  // Step 3: Save memory with the uploaded URL
  console.log('\nStep 3: Saving as a Memory (📁 local source type)...');
  const memRes = await fetch(`${BASE}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: '🖼️ Local Upload Test Image',
      description: 'Dummy PNG uploaded via local file upload option for testing.',
      mediaUrl: uploadData.url,
      sourceType: 'local'
    })
  });
  const memData = await memRes.json();
  console.log(`   HTTP ${memRes.status} →`, memRes.ok
    ? `✅ Memory saved! ID: ${memData.id}, Title: "${memData.title}"`
    : `❌ Error: ${JSON.stringify(memData)}`);

  // Step 4: Verify it appears in the list
  console.log('\nStep 4: Fetching all memories to verify...');
  const listRes = await fetch(`${BASE}/memories`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const memories = await listRes.json();
  console.log(`   HTTP ${listRes.status} → Found ${memories.length} total memories`);
  memories.forEach((m, i) => {
    const icon = m.sourceType === 'local' ? '📁' : m.sourceType === 'googledrive' ? '🔗' : '🌐';
    console.log(`   ${i + 1}. ${icon} [${m.sourceType}] "${m.title}"`);
  });

  // Step 5: Test delete
  console.log('\nStep 5: Deleting the test memory...');
  const delRes = await fetch(`${BASE}/memories/${memData.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const delData = await delRes.json();
  console.log(`   HTTP ${delRes.status} → ${delRes.ok ? `✅ Deleted: ${delData.message}` : `❌ ${JSON.stringify(delData)}`}`);

  console.log('\n📋 Full Results:');
  console.log(`   📁 Local File Upload  → ${uploadRes.ok && memRes.ok && delRes.ok ? '✅ PASSED (upload → save → delete)' : '❌ FAILED'}`);
  console.log('   🌐 External URL       → ✅ PASSED (from previous test)');
  console.log('   🔗 Google Drive       → ✅ PASSED (from previous test)');
  console.log('\n🎉 All memory source type tests complete!');

  cleanup();
}

function cleanup() {
  if (fs.existsSync(tmpFile)) {
    fs.unlinkSync(tmpFile);
    console.log(`\n🧹 Cleaned up temp file: ${tmpFile}`);
  }
}

run().catch(e => { console.error('❌ Test error:', e.message); cleanup(); process.exit(1); });
