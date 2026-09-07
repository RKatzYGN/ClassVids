// Toggle input fields based on upload type selection
function toggleInputType() {
  const type = document.getElementById('videoType').value;
  document.getElementById('urlInputGroup').style.display = (type === 'file') ? 'none' : 'block';
  document.getElementById('fileInputGroup').style.display = (type === 'file') ? 'block' : 'none';
}

// Fetch user folders and populate select dropdown
async function loadFolders() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: folders, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id);

  if (error) return console.error('Error fetching folders:', error);

  const select = document.getElementById('folderSelect');
  select.innerHTML = '<option value="">-- No Folder (Root) --</option>';
  folders.forEach(folder => {
    select.innerHTML += `<option value="${folder.id}">${folder.name}</option>`;
  });
}

// Create a new folder
async function createFolder() {
  const folderName = document.getElementById('folderName').value.trim();
  if (!folderName) return alert('Please enter a folder name.');

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('folders').insert([{ name: folderName, user_id: user.id }]);

  if (error) {
    alert('Failed to create folder: ' + error.message);
  } else {
    document.getElementById('folderName').value = '';
    loadFolders();
  }
}

// Upload direct file or process URL submission
async function submitVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  const folderId = document.getElementById('folderSelect').value || null;
  const type = document.getElementById('videoType').value;
  const { data: { user } } = await supabase.auth.getUser();

  if (!title) return alert('Please enter a video title.');

  let sourceUrl = '';

  if (type === 'file') {
    const fileInput = document.getElementById('videoFileInput');
    const file = fileInput.files[0];
    if (!file) return alert('Please select a video file to upload.');

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);

    if (uploadError) return alert('File upload failed: ' + uploadError.message);

    const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(filePath);
    sourceUrl = publicUrlData.publicUrl;
  } else {
    sourceUrl = document.getElementById('videoUrl').value.trim();
    if (!sourceUrl) return alert('Please enter a valid video URL.');
  }

  const { error: dbError } = await supabase.from('videos').insert([{
    user_id: user.id,
    folder_id: folderId,
    title: title,
    video_type: type,
    source_url: sourceUrl,
    approval_status: 'pending'
  }]);

  if (dbError) {
    alert('Submission failed: ' + dbError.message);
  } else {
    alert('Video submitted for admin approval!');
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoUrl').value = '';
    document.getElementById('videoFileInput').value = '';
    loadTeacherVideos();
  }
}

// Render list of teacher's submitted videos with approval status
async function loadTeacherVideos() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*, folders(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return console.error('Error fetching videos:', error);

  const container = document.getElementById('videoList');
  if (videos.length === 0) {
    container.innerHTML = '<p>No videos submitted yet.</p>';
    return;
  }

  container.innerHTML = videos.map(video => `
    <div class="video-card">
      <h3>${video.title}</h3>
      <p><strong>Folder:</strong> ${video.folders ? video.folders.name : 'Uncategorized'}</p>
      <p><strong>Type:</strong> ${video.video_type.toUpperCase()}</p>
      <p>
        <strong>Status:</strong> 
        <span class="status-badge status-${video.approval_status}">
          ${video.approval_status.toUpperCase()}
        </span>
      </p>
    </div>
  `).join('');
}

// Initialize on page load
window.onload = () => {
  loadFolders();
  loadTeacherVideos();
};
