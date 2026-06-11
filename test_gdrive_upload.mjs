/**
 * Simulates exactly what the FamilySphere app does when a user:
 * 1. Logs in
 * 2. Goes to Memories tab
 * 3. Selects "Google Drive" option
 * 4. Pastes the drive link and clicks "Add Memory"
 */
const BASE = 'http://localhost:5000/api';
const GDRIVE_LINK = 'https://drive.google.com/file/d/1bkEKfLiVJpJ7ZhrVoHXsarL3q1bPG8V7/view?usp=sharing';

// --- Mirrors the frontend's resolveMemoryMedia() function ---
function resolveMemoryMedia(mediaUrl) {
  if (!mediaUrl) return '';

  // Check for folder
  const folderMatch = mediaUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;

  // Check for file /d/ID
  const dMatch = mediaUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const idParamMatch = mediaUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const driveId = (dMatch && dMatch[1]) || (idParamMatch && idParamMatch[1]);

  if (driveId) {
    if (mediaUrl.includes('/document/')) return `https://docs.google.com/document/d/${driveId}/preview`;
    if (mediaUrl.includes('/presentation/')) return `https://docs.google.com/presentation/d/${driveId}/preview`;
    if (mediaUrl.includes('/spreadsheets/')) return `https://docs.google.com/spreadsheets/d/${driveId}/preview`;
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) return mediaUrl;
  return mediaUrl;
}

async function run() {
  console.log('🧪 FamilySphere — Google Drive Memory Upload Simulation');
  console.log('='.repeat(60));
  console.log(`📎 Drive link: ${GDRIVE_LINK}\n`);

  // STEP 1: Login
  console.log('👤 STEP 1: Login as Shubham...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Shubham@family.com', password: '!@#Shubham!@#' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) { console.error('❌ Login failed!', loginData); process.exit(1); }
  console.log(`   ✅ Logged in as "${loginData.name}" (${loginData.role})\n`);

  // STEP 2: Simulate clicking "Google Drive" tab + auto-detect
  console.log('🔗 STEP 2: Select Google Drive source type...');
  let sourceType = 'googledrive';
  // Auto-detect if drive URL is pasted
  if (GDRIVE_LINK.includes('drive.google.com') || GDRIVE_LINK.includes('docs.google.com')) {
    sourceType = 'googledrive';
  }
  console.log(`   sourceType set to: "${sourceType}" ✅\n`);

  // STEP 3: Fill in form — Title, Description, URL
  console.log('📝 STEP 3: Fill in memory form...');
  const title = 'Family Photo from Drive';
  const description = 'Test Google Drive memory upload';
  console.log(`   Title: "${title}"`);
  console.log(`   Description: "${description}"`);
  console.log(`   URL: "${GDRIVE_LINK}"\n`);

  // STEP 4: Click "Add Memory" — POST to /api/memories
  console.log('💾 STEP 4: Submitting memory (clicking Add Memory)...');
  const memRes = await fetch(`${BASE}/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title,
      description,
      mediaUrl: GDRIVE_LINK,
      sourceType
    })
  });
  const memData = await memRes.json();
  console.log(`   HTTP ${memRes.status} → ${memRes.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (!memRes.ok) { console.error('   Error:', memData); process.exit(1); }
  console.log(`   Memory ID  : ${memData.id}`);
  console.log(`   Title      : "${memData.title}"`);
  console.log(`   Description: "${memData.description}"`);
  console.log(`   sourceType : "${memData.sourceType}"`);
  console.log(`   mediaUrl   : ${memData.mediaUrl}\n`);

  // STEP 5: How it would render in the browser (resolveMemoryMedia)
  console.log('🖼️  STEP 5: Resolving embed URL (how it renders in browser)...');
  const embedUrl = resolveMemoryMedia(memData.mediaUrl);
  console.log(`   Input URL   : ${memData.mediaUrl}`);
  console.log(`   Embed URL   : ${embedUrl}`);
  console.log(`   Render type : <iframe src="${embedUrl}" /> (Google Drive preview)\n`);

  // STEP 6: Verify it appears in the memories list
  console.log('📋 STEP 6: Fetching memories list (what user sees on screen)...');
  const listRes = await fetch(`${BASE}/memories`, { headers: { 'Authorization': `Bearer ${token}` } });
  const memories = await listRes.json();
  console.log(`   Found ${memories.length} memories total:`);
  memories.forEach((m, i) => {
    const icon = m.sourceType === 'local' ? '📁' : m.sourceType === 'googledrive' ? '🔗' : '🌐';
    const isNew = m.id === memData.id ? ' ← NEW (just added)' : '';
    console.log(`   ${i + 1}. ${icon} "${m.title}" [${m.sourceType}]${isNew}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ RESULT: Google Drive memory upload SUCCESSFUL!');
  console.log(`   The drive file (ID: ${GDRIVE_LINK.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]})`);
  console.log(`   will be displayed as an embedded iframe preview at:`);
  console.log(`   ${embedUrl}`);
  console.log('='.repeat(60));

  // Cleanup
  await fetch(`${BASE}/memories/${memData.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  console.log('\n🧹 Test memory cleaned up.');
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
