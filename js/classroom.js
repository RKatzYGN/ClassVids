let currentVideos = [];

// Helper to extract clean embed URLs from various link formats
function getEmbedUrl(type, sourceUrl) {
  if (!sourceUrl) return '';

  if (type === 'youtube') {
    // Matches youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, etc.
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = sourceUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) {
      console.error('Could not extract YouTube ID from:', sourceUrl);
      return sourceUrl;
    }

    // Privacy-enhanced domain + parameters to hide recommendations and annotations
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
  } 

  if (type === 'vimeo') {
    // Matches vimeo.com/ID
    const match = sourceUrl.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      console.error('Could not extract Vimeo ID from:', sourceUrl);
      return sourceUrl;
    }

    return `https://player.vimeo.com/video/${videoId}?autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
  }

  // Fallback for direct storage video files (.mp4)
  return sourceUrl;
}

// Fetch only APPROVED videos belonging to the current teacher
async function loadClassroomLibrary() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const { data: videos, error } = await supabase
    .from('videos')
    .select('*, folders(id, name)')
    .eq('user_id', user.id)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching classroom library:', error);
    document.getElementById('sidebar').innerHTML = `<p style="color:red;">Error loading videos: ${error.message}</p>`;
    return;
  }

  currentVideos = videos || [];
  renderSidebar(currentVideos);
}

// Organize videos into folder groups in the sidebar
function renderSidebar(videos) {
  const sidebar = document.getElementById('sidebar');
  if (!videos || videos.length === 0) {
    sidebar.innerHTML = '<p style="padding:10px; color:#888;">No approved videos found in your library.</p>';
    return;
  }

  // Group videos by folder name
  const grouped = {};
  videos.forEach(video => {
    const folderName = video.folders ? video.folders.name : 'Uncategorized';
    if (!grouped[folderName]) grouped[folderName] = [];
    grouped[folderName].push(video);
  });

  let html = '';
  for (const [folderName, videoList] of Object.entries(grouped)) {
    html += `
      <div class="folder-group">
        <div class="folder-title">📁 ${folderName}</div>
        ${videoList.map(v => `
          <div class="video-item" onclick="playVideo('${v.id}')" id="btn-${v.id}">
            ▶ ${v.title}
          </div>
        `).join('')}
      </div>
    `;
  }

  sidebar.innerHTML = html;
}

// Swap the dynamic embed into the video player container
function playVideo(videoId) {
  const video = currentVideos.find(v => v.id === videoId);
  if (!video) return;

  // Highlight active sidebar item
  document.querySelectorAll('.video-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${videoId}`);
  if (activeBtn) activeBtn.classList.add('active');

  const container = document.getElementById('playerContainer');
  const titleDisplay = document.getElementById('nowPlayingTitle');
  const embedUrl = getEmbedUrl(video.video_type, video.source_url);

  titleDisplay.textContent = video.title;

  if (video.video_type === 'file') {
    // Render standard HTML5 Video player for uploaded direct files
    container.innerHTML = `
      <video controls autoplay controlsList="nodownload" style="width:100%; height:100%;">
        <source src="${embedUrl}">
        Your browser does not support playing this video format.
      </video>
    `;
  } else {
    // Render custom iframe embed for YouTube / Vimeo
    container.innerHTML = `
      <iframe 
        src="${embedUrl}" 
        style="width:100%; height:100%; border:none;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
        allowfullscreen>
      </iframe>
    `;
  }
}

// Initialize on load
window.onload = loadClassroomLibrary;
