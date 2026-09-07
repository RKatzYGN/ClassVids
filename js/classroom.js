let currentVideos = [];

function getEmbedUrl(type, sourceUrl) {
  if (!sourceUrl) return '';

  if (type === 'youtube') {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = sourceUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) return sourceUrl;
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;
  } 

  if (type === 'vimeo') {
    const match = sourceUrl.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    const videoId = match ? match[1] : null;

    if (!videoId) return sourceUrl;
    return `https://player.vimeo.com/video/${videoId}?autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
  }

  return sourceUrl;
}

async function loadClassroomLibrary() {
  const sidebar = document.getElementById('sidebar');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // Fetch approved videos belonging to logged-in teacher
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*, folders(id, name)')
    .eq('user_id', user.id)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching library:', error);
    sidebar.innerHTML = `<p style="color:red; padding:10px;">Error: ${error.message}</p>`;
    return;
  }

  currentVideos = videos || [];
  renderSidebar(currentVideos);
}

function renderSidebar(videos) {
  const sidebar = document.getElementById('sidebar');

  if (!videos || videos.length === 0) {
    sidebar.innerHTML = '<p style="padding:10px; color:#aaa;">No approved videos found in your library yet.</p>';
    return;
  }

  // Group videos by folder
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
          <button class="video-btn" onclick="playVideo('${v.id}')" id="btn-${v.id}">
            ▶ ${v.title}
          </button>
        `).join('')}
      </div>
    `;
  }

  sidebar.innerHTML = html;
}

function playVideo(videoId) {
  const video = currentVideos.find(v => v.id === videoId);
  if (!video) return;

  // Highlight active button
  document.querySelectorAll('.video-btn').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-${videoId}`);
  if (activeBtn) activeBtn.classList.add('active');

  const container = document.getElementById('playerContainer');
  const titleDisplay = document.getElementById('nowPlayingTitle');
  const embedUrl = getEmbedUrl(video.video_type, video.source_url);

  titleDisplay.textContent = video.title;

  if (video.video_type === 'file') {
    container.innerHTML = `
      <video controls autoplay controlsList="nodownload" style="width:100%; height:100%;">
        <source src="${embedUrl}">
        Your browser does not support playing this video format.
      </video>
    `;
  } else {
    container.innerHTML = `
      <iframe 
        src="${embedUrl}" 
        style="width:100%; height:100%; border:none;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
  }
}

window.onload = loadClassroomLibrary;
