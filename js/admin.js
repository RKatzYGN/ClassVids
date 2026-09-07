// Convert URLs for live inline previewing in the admin panel
function getPreviewEmbedUrl(type, sourceUrl) {
  if (type === 'youtube') {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = sourceUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } 
  if (type === 'vimeo') {
    const match = sourceUrl.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
    const videoId = match ? match[1] : null;
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return sourceUrl;
}

// Fetch all videos across all teachers where status is 'pending'
async function loadApprovalQueue() {
  // Join profile data to show teacher details
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*, profiles:user_id (email)')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return console.error('Error loading approval queue:', error);

  const container = document.getElementById('approvalQueue');
  
  if (videos.length === 0) {
    container.innerHTML = '<div class="card"><p>No pending video submissions in the queue!</p></div>';
    return;
  }

  container.innerHTML = videos.map(video => {
    const embedUrl = getPreviewEmbedUrl(video.video_type, video.source_url);
    const teacherEmail = video.profiles ? video.profiles.email : 'Unknown Teacher';
    
    let mediaElement = video.video_type === 'file'
      ? `<video controls src="${embedUrl}"></video>`
      : `<iframe src="${embedUrl}" allowfullscreen></iframe>`;

    return `
      <div class="card" id="video-${video.id}">
        <h2>${video.title}</h2>
        <div class="meta">
          <p><strong>Submitted by:</strong> ${teacherEmail}</p>
          <p><strong>Platform:</strong> ${video.video_type.toUpperCase()}</p>
          <p><strong>Submitted on:</strong> ${new Date(video.created_at).toLocaleDateString()}</p>
        </div>
        <div class="preview-container">
          ${mediaElement}
        </div>
        <div class="actions">
          <button class="btn-approve" onclick="updateStatus('${video.id}', 'approved')">Approve Video</button>
          <button class="btn-reject" onclick="updateStatus('${video.id}', 'rejected')">Reject Video</button>
        </div>
      </div>
    `;
  }).join('');
}

// Update status to 'approved' or 'rejected'
async function updateStatus(videoId, newStatus) {
  const { error } = await supabase
    .from('videos')
    .update({ approval_status: newStatus })
    .eq('id', videoId);

  if (error) {
    alert('Failed to update status: ' + error.message);
  } else {
    // Remove approved/rejected card from UI
    const card = document.getElementById(`video-${videoId}`);
    if (card) card.remove();
    
    if (document.querySelectorAll('.card').length === 0) {
      document.getElementById('approvalQueue').innerHTML = '<div class="card"><p>No pending video submissions in the queue!</p></div>';
    }
  }
}

// Verify user is an admin on load
window.onload = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    alert('Access restricted to Admins only.');
    window.location.href = 'teacher.html';
    return;
  }

  loadApprovalQueue();
};
