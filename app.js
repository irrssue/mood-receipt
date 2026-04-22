const state = {
  selected: new Set(),
  photoDataUrl: null,
  ytId: null,
  ytTitle: null,
  ytChannel: null,
};

// ── SCREEN 1 ──
function toggleOpt(card) {
  const opt = card.dataset.opt;
  if (opt === 'mood') return;
  card.classList.toggle('selected');
  if (card.classList.contains('selected')) state.selected.add(opt);
  else state.selected.delete(opt);
  document.getElementById('btn-next1').disabled = state.selected.size === 0;
}

function goToScreen2() {
  document.getElementById('fill-photo').style.display =
    state.selected.has('photo') ? 'block' : 'none';
  document.getElementById('fill-music').style.display =
    state.selected.has('music') ? 'block' : 'none';
  switchScreen('screen-fill');
}

function goBack() { switchScreen('screen-pick'); }

// ── PHOTO ──
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('photo-drop').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPhoto(file);
}

function handleFileInput(input) {
  const file = input.files[0];
  if (file) loadPhoto(file);
}

function loadPhoto(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    state.photoDataUrl = ev.target.result;
    const preview = document.getElementById('photo-preview');
    preview.src = ev.target.result;
    preview.classList.add('visible');
  };
  reader.readAsDataURL(file);
}

// ── MUSIC / YOUTUBE ──
function parseYtId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (_) {}
  return null;
}

function handleYtInput(input) {
  const val = input.value.trim();
  const errEl = document.getElementById('yt-error');
  const previewEl = document.getElementById('yt-preview');

  if (!val) {
    input.classList.remove('error');
    errEl.classList.remove('visible');
    previewEl.classList.remove('visible');
    state.ytId = null;
    return;
  }

  const id = parseYtId(val);
  if (!id) {
    input.classList.add('error');
    errEl.classList.add('visible');
    previewEl.classList.remove('visible');
    state.ytId = null;
    return;
  }

  input.classList.remove('error');
  errEl.classList.remove('visible');
  state.ytId = id;

  document.getElementById('yt-thumb').src =
    `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  document.getElementById('yt-title').textContent = 'youtube track';
  document.getElementById('yt-channel').textContent = '—';

  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    .then(r => r.json())
    .then(data => {
      state.ytTitle = data.title;
      state.ytChannel = data.author_name;
      document.getElementById('yt-title').textContent = data.title;
      document.getElementById('yt-channel').textContent = data.author_name;
    })
    .catch(() => {
      state.ytTitle = 'youtube track';
      state.ytChannel = '—';
    });

  previewEl.classList.add('visible');
}

// ── GENERATE RECEIPT ──
function generateReceipt() {
  const now = new Date();
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const dateStr = `${days[now.getDay()]} ${String(now.getDate()).padStart(2,'0')}/${months[now.getMonth()]}/${String(now.getFullYear()).slice(2)}`;
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const custNum = String(now.getFullYear()).slice(2) + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');

  document.getElementById('r-date').textContent = dateStr;
  document.getElementById('r-time').textContent = timeStr;
  document.getElementById('r-cust').textContent = `CUST #${custNum}`;
  document.getElementById('r-barcode-num').textContent = `9 ${custNum} ${String(now.getTime()).slice(-6)}`;

  const photoBlock = document.getElementById('r-photo-block');
  if (state.selected.has('photo') && state.photoDataUrl) {
    document.getElementById('r-photo-img').src = state.photoDataUrl;
    photoBlock.style.display = 'block';
  } else {
    photoBlock.style.display = 'none';
  }

  const musicBlock = document.getElementById('r-music-block');
  const itemsDivider = document.getElementById('r-items-divider');
  if (state.selected.has('music') && state.ytId) {
    document.getElementById('r-music-thumb').src =
      `https://img.youtube.com/vi/${state.ytId}/mqdefault.jpg`;
    document.getElementById('r-music-title').textContent = state.ytTitle || 'youtube track';
    document.getElementById('r-music-channel').textContent = state.ytChannel || '—';
    miReset();
    musicBlock.style.display = 'block';
    itemsDivider.style.display = 'block';
    miInitPlayer(state.ytId);
  } else {
    musicBlock.style.display = 'none';
    itemsDivider.style.display = 'none';
  }

  switchScreen('screen-receipt');
}

// ── RESTART ──
function restart() {
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
  miReset();
  state.selected.clear();
  state.photoDataUrl = null;
  state.ytId = null;
  state.ytTitle = null;
  state.ytChannel = null;

  document.querySelectorAll('.opt-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-next1').disabled = true;

  const preview = document.getElementById('photo-preview');
  preview.src = '';
  preview.classList.remove('visible');

  document.getElementById('yt-input').value = '';
  document.getElementById('yt-preview').classList.remove('visible');
  document.getElementById('yt-error').classList.remove('visible');

  switchScreen('screen-pick');
}

// ── MUSIC ISLAND PLAYER ──
let ytPlayer = null;
let miTimer = null;

function miInitPlayer(videoId) {
  miReset();
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => miCreatePlayer(videoId);
  } else {
    miCreatePlayer(videoId);
  }
}

function miCreatePlayer(videoId) {
  if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }
  ytPlayer = new YT.Player('yt-player-iframe', {
    videoId,
    playerVars: { autoplay: 0, controls: 0, modestbranding: 1 },
    events: {
      onStateChange: (e) => {
        const playing = e.data === YT.PlayerState.PLAYING;
        document.getElementById('music-island').classList.toggle('playing', playing);
        document.getElementById('mi-play-icon').style.display = playing ? 'none' : 'block';
        document.getElementById('mi-pause-icon').style.display = playing ? 'block' : 'none';
        if (playing) {
          miTimer = setInterval(miTick, 500);
        } else {
          clearInterval(miTimer);
        }
      },
      onReady: (e) => {
        const dur = e.target.getDuration();
        document.getElementById('mi-dur').textContent = miFormat(dur);
      }
    }
  });
}

function miTick() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const cur = ytPlayer.getCurrentTime();
  const dur = ytPlayer.getDuration();
  document.getElementById('mi-cur').textContent = miFormat(cur);
  document.getElementById('mi-fill').style.width = dur ? `${(cur / dur) * 100}%` : '0%';
}

function miToggle() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
  try {
    const playerState = ytPlayer.getPlayerState();
    if (playerState === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  } catch (e) {}
}

function miSkip(sec) {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  ytPlayer.seekTo(ytPlayer.getCurrentTime() + sec, true);
}

function miSeek(e) {
  if (!ytPlayer || typeof ytPlayer.getDuration !== 'function') return;
  const bar = document.getElementById('mi-bar');
  const ratio = e.offsetX / bar.offsetWidth;
  ytPlayer.seekTo(ytPlayer.getDuration() * ratio, true);
}

function miReset() {
  clearInterval(miTimer);
  document.getElementById('mi-fill').style.width = '0%';
  document.getElementById('mi-cur').textContent = '0:00';
  document.getElementById('mi-dur').textContent = '0:00';
  document.getElementById('mi-play-icon').style.display = 'block';
  document.getElementById('mi-pause-icon').style.display = 'none';
  document.getElementById('music-island').classList.remove('playing');
}

function miFormat(sec) {
  sec = Math.floor(sec || 0);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = '';
}
