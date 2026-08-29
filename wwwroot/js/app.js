/**
 * Transkript Okuyucu - YouTube Canlı Takip & Dışa Aktarma
 * Frontend Logic, Custom Video Player Controls & Live Synchronization
 */

// Application State
const state = {
    currentVideoUrl: '',
    currentVideoId: '',
    metadata: null,
    transcript: null,
    activeItemIndex: -1,
    syncInterval: null,
    searchQuery: '',
    player: null,
    isPlayerReady: false,
    isPlaying: false,
    durationSeconds: 0,
    isDraggingProgress: false,
    hideControlsTimeout: null,
    volume: 100,
    isMuted: false,
    playbackSpeed: 1
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    aiProviderSelect: document.getElementById('aiProviderSelect'),
    aiApiKeyInput: document.getElementById('aiApiKeyInput'),
    urlForm: document.getElementById('urlForm'),
    videoUrlInput: document.getElementById('videoUrlInput'),
    pasteBtn: document.getElementById('pasteBtn'),
    fetchBtn: document.getElementById('fetchBtn'),
    alertBox: document.getElementById('alertBox'),
    workspaceSection: document.getElementById('workspaceSection'),
    
    // Video player & info
    videoWrapper: document.getElementById('videoWrapper'),
    videoTitle: document.getElementById('videoTitle'),
    videoAuthor: document.getElementById('videoAuthor'),
    videoDuration: document.getElementById('videoDuration'),
    videoSourceLink: document.getElementById('videoSourceLink'),
    
    // Custom Video Controls Overlay
    customVideoControls: document.getElementById('customVideoControls'),
    videoProgressArea: document.getElementById('videoProgressArea'),
    videoProgressBuffered: document.getElementById('videoProgressBuffered'),
    videoProgressBar: document.getElementById('videoProgressBar'),
    videoProgressThumb: document.getElementById('videoProgressThumb'),
    videoTimeTooltip: document.getElementById('videoTimeTooltip'),
    
    ctrlPlayPauseBtn: document.getElementById('ctrlPlayPauseBtn'),
    ctrlRewindBtn: document.getElementById('ctrlRewindBtn'),
    ctrlForwardBtn: document.getElementById('ctrlForwardBtn'),
    ctrlMuteBtn: document.getElementById('ctrlMuteBtn'),
    ctrlVolumeSlider: document.getElementById('ctrlVolumeSlider'),
    ctrlCurrentTime: document.getElementById('ctrlCurrentTime'),
    ctrlDuration: document.getElementById('ctrlDuration'),
    ctrlSpeedBtn: document.getElementById('ctrlSpeedBtn'),
    ctrlSpeedText: document.getElementById('ctrlSpeedText'),
    ctrlSpeedMenu: document.getElementById('ctrlSpeedMenu'),
    ctrlFullscreenBtn: document.getElementById('ctrlFullscreenBtn'),
    
    // Transcript elements
    transcriptCard: document.querySelector('.transcript-card'),
    langSelectorWrapper: document.getElementById('langSelectorWrapper'),
    languageSelect: document.getElementById('languageSelect'),
    transcriptToolbar: document.getElementById('transcriptToolbar'),
    transcriptSearch: document.getElementById('transcriptSearch'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    autoScrollToggle: document.getElementById('autoScrollToggle'),
    summarizeBtn: document.getElementById('summarizeBtn'),
    aiSummaryBox: document.getElementById('aiSummaryBox'),
    aiSummaryContent: document.getElementById('aiSummaryContent'),
    closeSummaryBtn: document.getElementById('closeSummaryBtn'),
    transcriptList: document.getElementById('transcriptList'),
    itemCountBadge: document.getElementById('itemCountBadge'),
    transcriptFooter: document.getElementById('transcriptFooter'),
    
    // Export buttons
    downloadDocxBtn: document.getElementById('downloadDocxBtn'),
    copyTranscriptBtn: document.getElementById('copyTranscriptBtn'),
    downloadTxtBtn: document.getElementById('downloadTxtBtn'),
    downloadSrtBtn: document.getElementById('downloadSrtBtn')
};

/* ==========================================================
   Initialization & Theme Management
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    setupVideoControlsEvents();
    setupKeyboardShortcuts();
});

function initTheme() {
    const savedTheme = localStorage.getItem('transkript_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('transkript_theme', newTheme);
}

/* ==========================================================
   Event Listeners Setup
   ========================================================== */
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);

    // Settings Modal
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettingsModal();
    });

    // Paste button
    elements.pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                elements.videoUrlInput.value = text.trim();
                elements.videoUrlInput.focus();
            }
        } catch (err) {
            elements.videoUrlInput.focus();
        }
    });

    // Form Submit (Fetch Transcript)
    elements.urlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = elements.videoUrlInput.value.trim();
        if (url) {
            loadVideoAndTranscript(url);
        }
    });

    // Language Change
    elements.languageSelect.addEventListener('change', () => {
        const selectedOption = elements.languageSelect.selectedOptions[0];
        if (!selectedOption) return;
        
        const langCode = selectedOption.value;
        const isAuto = selectedOption.getAttribute('data-auto') === 'true';
        fetchTranscriptForLanguage(state.currentVideoUrl, langCode, isAuto);
    });

    // Search filter
    elements.transcriptSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        renderTranscriptItems();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        elements.transcriptSearch.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        renderTranscriptItems();
    });

    // AI Summarize
    elements.summarizeBtn.addEventListener('click', handleSummarize);
    elements.closeSummaryBtn.addEventListener('click', () => {
        elements.aiSummaryBox.style.display = 'none';
    });

    // Alert Close
    elements.alertBox.querySelector('.alert-close').addEventListener('click', () => {
        elements.alertBox.style.display = 'none';
    });

    // Export Actions
    elements.downloadDocxBtn.addEventListener('click', exportDocx);
    elements.copyTranscriptBtn.addEventListener('click', copyTranscriptToClipboard);
    elements.downloadTxtBtn.addEventListener('click', exportTxt);
    elements.downloadSrtBtn.addEventListener('click', exportSrt);
}

/* ==========================================================
   Video Player Custom Overlay Controls Setup
   ========================================================== */
function setupVideoControlsEvents() {
    // 1. Mouse hover & auto-hide behavior
    elements.videoWrapper.addEventListener('mousemove', () => {
        showVideoControls();
    });

    elements.videoWrapper.addEventListener('mouseenter', () => {
        showVideoControls();
    });

    elements.videoWrapper.addEventListener('mouseleave', () => {
        if (!state.isDraggingProgress) {
            hideVideoControls();
        }
    });

    // 2. Play / Pause button
    elements.ctrlPlayPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause();
    });

    // 3. Rewind & Forward (-10s / +10s)
    elements.ctrlRewindBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        seekRelative(-10);
    });

    elements.ctrlForwardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        seekRelative(10);
    });

    // 4. Volume & Mute
    elements.ctrlMuteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMute();
    });

    elements.ctrlVolumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const val = parseInt(e.target.value, 10);
        setPlayerVolume(val);
    });

    // 5. Progress Bar Hover & Scrubbing
    elements.videoProgressArea.addEventListener('mousemove', (e) => {
        const rect = elements.videoProgressArea.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const hoverSecs = ratio * (state.durationSeconds || 0);

        elements.videoTimeTooltip.textContent = formatTimeSpan(hoverSecs);
        elements.videoTimeTooltip.style.left = `${(ratio * 100).toFixed(1)}%`;
        elements.videoTimeTooltip.style.display = 'block';
    });

    elements.videoProgressArea.addEventListener('mouseleave', () => {
        elements.videoTimeTooltip.style.display = 'none';
    });

    elements.videoProgressArea.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = elements.videoProgressArea.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetSecs = ratio * (state.durationSeconds || 0);
        seekVideoTo(targetSecs);
    });

    // 6. Playback Speed Selector
    elements.ctrlSpeedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = elements.ctrlSpeedMenu.style.display === 'none';
        elements.ctrlSpeedMenu.style.display = isHidden ? 'flex' : 'none';
    });

    elements.ctrlSpeedMenu.querySelectorAll('.speed-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const speed = parseFloat(opt.getAttribute('data-speed'));
            setPlayerPlaybackRate(speed);
            elements.ctrlSpeedMenu.style.display = 'none';
        });
    });

    // Close speed menu when clicking elsewhere
    document.addEventListener('click', () => {
        elements.ctrlSpeedMenu.style.display = 'none';
    });

    // 7. Fullscreen Toggle
    elements.ctrlFullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', updateFullscreenIcons);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcons);
}

function showVideoControls() {
    elements.customVideoControls.classList.add('active');
    if (state.hideControlsTimeout) clearTimeout(state.hideControlsTimeout);

    // Auto-hide after 2.5s if video is playing
    if (state.isPlaying) {
        state.hideControlsTimeout = setTimeout(() => {
            if (!elements.videoWrapper.matches(':hover') || state.isPlaying) {
                elements.customVideoControls.classList.remove('active');
            }
        }, 2500);
    }
}

function hideVideoControls() {
    if (state.hideControlsTimeout) clearTimeout(state.hideControlsTimeout);
    elements.customVideoControls.classList.remove('active');
}

function togglePlayPause() {
    if (!state.player || !state.isPlayerReady) return;

    if (state.isPlaying) {
        state.player.pauseVideo();
    } else {
        state.player.playVideo();
    }
}

function updatePlayPauseIcons(isPlaying) {
    state.isPlaying = isPlaying;
    const playIcon = elements.ctrlPlayPauseBtn.querySelector('.icon-play');
    const pauseIcon = elements.ctrlPlayPauseBtn.querySelector('.icon-pause');

    if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

function seekRelative(deltaSeconds) {
    if (!state.player || !state.isPlayerReady || typeof state.player.getCurrentTime !== 'function') return;

    const current = state.player.getCurrentTime() || 0;
    const target = Math.max(0, Math.min(state.durationSeconds || current + deltaSeconds, current + deltaSeconds));
    seekVideoTo(target);
}

function toggleMute() {
    if (!state.player || !state.isPlayerReady) return;

    if (state.player.isMuted()) {
        state.player.unMute();
        state.isMuted = false;
        elements.ctrlVolumeSlider.value = state.volume > 0 ? state.volume : 50;
        updateVolumeIcons(state.volume);
    } else {
        state.player.mute();
        state.isMuted = true;
        updateVolumeIcons(0);
    }
}

function setPlayerVolume(val) {
    if (!state.player || !state.isPlayerReady) return;

    state.volume = val;
    state.player.setVolume(val);

    if (val === 0) {
        state.player.mute();
        state.isMuted = true;
    } else if (state.isMuted) {
        state.player.unMute();
        state.isMuted = false;
    }

    updateVolumeIcons(val);
}

function updateVolumeIcons(val) {
    const highIcon = elements.ctrlMuteBtn.querySelector('.icon-vol-high');
    const muteIcon = elements.ctrlMuteBtn.querySelector('.icon-vol-mute');

    if (val === 0 || state.isMuted) {
        highIcon.style.display = 'none';
        muteIcon.style.display = 'block';
    } else {
        highIcon.style.display = 'block';
        muteIcon.style.display = 'none';
    }
}

function setPlayerPlaybackRate(rate) {
    if (!state.player || !state.isPlayerReady) return;

    state.playbackSpeed = rate;
    state.player.setPlaybackRate(rate);
    elements.ctrlSpeedText.textContent = rate === 1 ? '1x' : `${rate}x`;

    elements.ctrlSpeedMenu.querySelectorAll('.speed-opt').forEach(opt => {
        const optSpeed = parseFloat(opt.getAttribute('data-speed'));
        if (optSpeed === rate) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (elements.videoWrapper.requestFullscreen) {
            elements.videoWrapper.requestFullscreen();
        } else if (elements.videoWrapper.webkitRequestFullscreen) {
            elements.videoWrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

function updateFullscreenIcons() {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const enterIcon = elements.ctrlFullscreenBtn.querySelector('.icon-fullscreen-enter');
    const exitIcon = elements.ctrlFullscreenBtn.querySelector('.icon-fullscreen-exit');

    if (isFull) {
        enterIcon.style.display = 'none';
        exitIcon.style.display = 'block';
    } else {
        enterIcon.style.display = 'block';
        exitIcon.style.display = 'none';
    }
}

/* ==========================================================
   Keyboard Shortcuts
   ========================================================== */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // If typing in input, ignore shortcuts
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            seekRelative(-5);
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            seekRelative(5);
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            const newVol = Math.min(100, state.volume + 10);
            elements.ctrlVolumeSlider.value = newVol;
            setPlayerVolume(newVol);
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            const newVol = Math.max(0, state.volume - 10);
            elements.ctrlVolumeSlider.value = newVol;
            setPlayerVolume(newVol);
        } else if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            toggleMute();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFullscreen();
        }
    });
}

/* ==========================================================
   Settings Modal Logic
   ========================================================== */
function openSettingsModal() {
    elements.aiProviderSelect.value = localStorage.getItem('transkript_ai_provider') || 'Gemini';
    elements.aiApiKeyInput.value = localStorage.getItem('transkript_ai_apikey') || '';
    elements.settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
    elements.settingsModal.style.display = 'none';
}

function saveSettings() {
    const provider = elements.aiProviderSelect.value;
    const apiKey = elements.aiApiKeyInput.value.trim();
    localStorage.setItem('transkript_ai_provider', provider);
    localStorage.setItem('transkript_ai_apikey', apiKey);
    closeSettingsModal();
    showToast('Ayarlar kaydedildi.');
}

/* ==========================================================
   AI Summarization
   ========================================================== */
async function handleSummarize() {
    if (!state.transcript || !state.transcript.items || state.transcript.items.length === 0) return;

    const provider = localStorage.getItem('transkript_ai_provider') || 'Gemini';
    const apiKey = localStorage.getItem('transkript_ai_apikey') || '';

    if (!apiKey) {
        showAlert('Lütfen özetleme işlemi için Ayarlar menüsünden API anahtarınızı girin.', 'error');
        openSettingsModal();
        return;
    }

    elements.aiSummaryBox.style.display = 'block';
    elements.aiSummaryContent.innerHTML = '<span style="color:var(--text-secondary);">Özet oluşturuluyor, lütfen bekleyin...</span>';
    elements.summarizeBtn.disabled = true;

    try {
        const fullText = state.transcript.items.map(i => i.text).join(' ');

        const res = await fetch('/api/transcript/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                TranscriptText: fullText,
                Provider: provider,
                ApiKey: apiKey
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Özetleme işlemi başarısız oldu.');
        }

        elements.aiSummaryContent.innerHTML = escapeHtml(data.data);
    } catch (err) {
        console.error('AI Error:', err);
        elements.aiSummaryContent.innerHTML = `<span style="color: #ef4444;">Hata: ${escapeHtml(err.message)}</span>`;
    } finally {
        elements.summarizeBtn.disabled = false;
    }
}

/* ==========================================================
   Alert / Toast Helper
   ========================================================== */
function showAlert(message, type = 'error') {
    elements.alertBox.className = `alert-box ${type === 'success' ? 'success' : ''}`;
    elements.alertBox.querySelector('.alert-msg').textContent = message;
    elements.alertBox.style.display = 'flex';
}

function hideAlert() {
    elements.alertBox.style.display = 'none';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2600);
}

/* ==========================================================
   Loading State Helpers
   ========================================================== */
function setLoading(isLoading) {
    const btnText = elements.fetchBtn.querySelector('.btn-text');
    const spinner = elements.fetchBtn.querySelector('.btn-spinner');
    const arrow = elements.fetchBtn.querySelector('.btn-arrow');

    if (isLoading) {
        btnText.textContent = 'Alınıyor...';
        spinner.style.display = 'inline-block';
        arrow.style.display = 'none';
        elements.fetchBtn.disabled = true;
    } else {
        btnText.textContent = 'Transkripti Getir';
        spinner.style.display = 'none';
        arrow.style.display = 'inline-block';
        elements.fetchBtn.disabled = false;
    }
}

/* ==========================================================
   Main Video & Transcript Loading Flow
   ========================================================== */
async function loadVideoAndTranscript(url) {
    hideAlert();
    setLoading(true);

    // Clean previous state immediately so old transcript is not retained
    resetTranscriptState();

    state.currentVideoUrl = url;

    try {
        // 1. Fetch Video Metadata & Available caption tracks
        const infoRes = await fetch('/api/video/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const infoData = await infoRes.json();
        if (!infoRes.ok || !infoData.success) {
            throw new Error(infoData.message || 'Video bilgisi alınamadı.');
        }

        state.metadata = infoData.data;
        state.currentVideoId = state.metadata.id;
        state.durationSeconds = state.metadata.durationTotalSeconds || 0;

        // Populate Video Card Info
        elements.videoTitle.textContent = state.metadata.title;
        elements.videoAuthor.textContent = state.metadata.author;
        elements.videoDuration.textContent = state.metadata.duration || '--:--';
        elements.ctrlDuration.textContent = state.metadata.duration || '--:--';

        // Setup Video Source Link Button
        const sourceUrl = `https://www.youtube.com/watch?v=${state.metadata.id}`;
        elements.videoSourceLink.href = sourceUrl;

        // Populate Language Selector Dropdown
        populateLanguageSelect(state.metadata.availableTracks);

        // Mount / Update YouTube Player
        mountYouTubePlayer(state.metadata.id);

        // Display workspace
        elements.workspaceSection.style.display = 'grid';
        elements.workspaceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 2. Fetch Transcript
        await fetchTranscriptForLanguage(url);

    } catch (err) {
        console.error(err);
        showAlert(err.message || 'Bir hata oluştu.');
        showTranscriptNotFoundWarning(err.message);
    } finally {
        setLoading(false);
    }
}

function resetTranscriptState() {
    state.transcript = null;
    state.activeItemIndex = -1;
    state.searchQuery = '';
    elements.transcriptSearch.value = '';
    elements.clearSearchBtn.style.display = 'none';

    // Clear transcript container
    elements.transcriptList.innerHTML = `
        <div class="empty-transcript">
            <p>Transkript verisi yükleniyor...</p>
        </div>
    `;
    elements.itemCountBadge.textContent = 'Yükleniyor...';

    // Hide AI elements
    elements.summarizeBtn.style.display = 'none';
    elements.aiSummaryBox.style.display = 'none';
    elements.aiSummaryContent.innerHTML = '';

    // Hide bottom export buttons
    elements.transcriptFooter.style.display = 'none';

    if (state.syncInterval) {
        clearInterval(state.syncInterval);
        state.syncInterval = null;
    }
}

function populateLanguageSelect(tracks) {
    elements.languageSelect.innerHTML = '';

    if (!tracks || tracks.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Altyazı Yok';
        elements.languageSelect.appendChild(opt);
        return;
    }

    tracks.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t.languageCode;
        opt.setAttribute('data-auto', t.isAutoGenerated ? 'true' : 'false');
        opt.textContent = `${t.languageName} ${t.isAutoGenerated ? '(Otomatik)' : '(Resmi)'}`;
        elements.languageSelect.appendChild(opt);
    });
}

async function fetchTranscriptForLanguage(url, langCode = null, isAuto = null) {
    try {
        const res = await fetch('/api/transcript/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                languageCode: langCode,
                isAutoGenerated: isAuto
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Transkript verisi bulunamadı.');
        }

        state.transcript = data.data;
        state.activeItemIndex = -1;

        // Select the active language in dropdown if needed
        if (state.transcript.languageCode) {
            for (let opt of elements.languageSelect.options) {
                if (opt.value.toLowerCase() === state.transcript.languageCode.toLowerCase()) {
                    opt.selected = true;
                    break;
                }
            }
        }

        // Show export footer and render items
        elements.transcriptFooter.style.display = 'block';
        elements.summarizeBtn.style.display = 'flex';
        renderTranscriptItems();
        startSyncLoop();

    } catch (err) {
        console.warn('Transcript not found or failed:', err);
        state.transcript = null;
        showTranscriptNotFoundWarning(err.message);
    }
}

function showTranscriptNotFoundWarning(customMsg) {
    // Hide footer export buttons when transcript is missing
    elements.transcriptFooter.style.display = 'none';
    elements.itemCountBadge.textContent = '0 satır';

    const desc = customMsg || 'Bu video için herhangi bir altyazı veya transkript kaydı bulunamadı. YouTube üzerinde altyazısı bulunan başka bir video deneyebilirsiniz.';

    elements.transcriptList.innerHTML = `
        <div class="transcript-warning-box">
            <div class="warning-icon-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <h4 class="warning-title">Transkript Bulunamadı</h4>
            <p class="warning-description">${escapeHtml(desc)}</p>
        </div>
    `;
}

/* ==========================================================
   Transcript Rendering & Highlight
   ========================================================== */
function renderTranscriptItems() {
    elements.transcriptList.innerHTML = '';

    if (!state.transcript || !state.transcript.items || state.transcript.items.length === 0) {
        showTranscriptNotFoundWarning('Bu video için transkript satırı bulunamadı.');
        return;
    }

    const items = state.transcript.items;
    const query = state.searchQuery;
    let matchCount = 0;

    items.forEach((item, index) => {
        const text = item.text;
        const isMatch = !query || text.toLowerCase().includes(query);

        if (!isMatch) return;
        matchCount++;

        const itemEl = document.createElement('div');
        itemEl.className = `transcript-item ${index === state.activeItemIndex ? 'active' : ''}`;
        itemEl.setAttribute('data-index', index);
        itemEl.setAttribute('data-offset', item.offsetSeconds);

        let displayText = escapeHtml(text);
        if (query) {
            const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
            displayText = displayText.replace(regex, '<mark class="search-hit">$1</mark>');
        }

        itemEl.innerHTML = `
            <span class="item-timestamp">${item.timestampFormatted}</span>
            <span class="item-text">${displayText}</span>
        `;

        // Click to seek video to timestamp
        itemEl.addEventListener('click', () => {
            seekVideoTo(item.offsetSeconds);
        });

        elements.transcriptList.appendChild(itemEl);
    });

    elements.itemCountBadge.textContent = query 
        ? `${matchCount} / ${items.length} sonuç` 
        : `${items.length} satır`;
}

/* ==========================================================
   YouTube IFrame Player & Real-Time Sync
   ========================================================== */
function mountYouTubePlayer(videoId) {
    if (state.player && typeof state.player.loadVideoById === 'function') {
        state.player.loadVideoById(videoId);
        return;
    }

    // Wait until YT API is ready if needed
    if (typeof YT === 'undefined' || !YT.Player) {
        window.onYouTubeIframeAPIReady = () => {
            createPlayer(videoId);
        };
    } else {
        createPlayer(videoId);
    }
}

function createPlayer(videoId) {
    state.player = new YT.Player('youtubePlayer', {
        videoId: videoId,
        playerVars: {
            playsinline: 1,
            controls: 1, // Standard YT controls enabled
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: (event) => {
                state.isPlayerReady = true;
                if (typeof event.target.getDuration === 'function') {
                    const dur = event.target.getDuration();
                    if (dur > 0) {
                        state.durationSeconds = dur;
                        elements.ctrlDuration.textContent = formatTimeSpan(dur);
                    }
                }
                startSyncLoop();
            },
            onStateChange: (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    updatePlayPauseIcons(true);
                    startSyncLoop();
                } else if (event.data === YT.PlayerState.PAUSED) {
                    updatePlayPauseIcons(false);
                    showVideoControls();
                } else if (event.data === YT.PlayerState.ENDED) {
                    updatePlayPauseIcons(false);
                    showVideoControls();
                }
            }
        }
    });
}

function seekVideoTo(seconds) {
    if (state.player && typeof state.player.seekTo === 'function') {
        state.player.seekTo(seconds, true);
        state.player.playVideo();
        updatePlayPauseIcons(true);
    }
}

function startSyncLoop() {
    if (state.syncInterval) clearInterval(state.syncInterval);

    state.syncInterval = setInterval(() => {
        updateVideoPlaybackProgress();
        syncTranscriptWithPlayback();
    }, 200);
}

function updateVideoPlaybackProgress() {
    if (!state.player || !state.isPlayerReady || typeof state.player.getCurrentTime !== 'function') return;

    const currentTime = state.player.getCurrentTime() || 0;
    const duration = state.player.getDuration() || state.durationSeconds || 0;

    if (duration > 0 && duration !== state.durationSeconds) {
        state.durationSeconds = duration;
        elements.ctrlDuration.textContent = formatTimeSpan(duration);
    }

    elements.ctrlCurrentTime.textContent = formatTimeSpan(currentTime);

    if (duration > 0) {
        const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        elements.videoProgressBar.style.width = `${pct}%`;
        elements.videoProgressThumb.style.left = `${pct}%`;

        // Update buffered bar
        if (typeof state.player.getVideoLoadedFraction === 'function') {
            const bufferedPct = (state.player.getVideoLoadedFraction() || 0) * 100;
            elements.videoProgressBuffered.style.width = `${bufferedPct}%`;
        }
    }
}

function syncTranscriptWithPlayback() {
    if (!state.player || typeof state.player.getCurrentTime !== 'function' || !state.transcript) {
        return;
    }

    const currentTime = state.player.getCurrentTime();
    const items = state.transcript.items;
    if (!items || items.length === 0) return;

    // Find current active item
    let foundIndex = -1;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const nextItem = items[i + 1];
        const start = item.offsetSeconds;
        const end = nextItem ? nextItem.offsetSeconds : (start + item.durationSeconds + 1);

        if (currentTime >= start && currentTime < end) {
            foundIndex = i;
            break;
        }
    }

    // If past all items, highlight last
    if (foundIndex === -1 && currentTime >= items[items.length - 1].offsetSeconds) {
        foundIndex = items.length - 1;
    }

    if (foundIndex !== -1 && foundIndex !== state.activeItemIndex) {
        state.activeItemIndex = foundIndex;
        updateActiveItemHighlight(foundIndex);
    }
}

function updateActiveItemHighlight(activeIndex) {
    // Remove previous active classes
    const existingActive = elements.transcriptList.querySelector('.transcript-item.active');
    if (existingActive) {
        existingActive.classList.remove('active');
    }

    // Find active element
    const newActive = elements.transcriptList.querySelector(`.transcript-item[data-index="${activeIndex}"]`);
    if (newActive) {
        newActive.classList.add('active');

        // Auto-scroll if enabled
        if (elements.autoScrollToggle.checked) {
            newActive.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
}

/* ==========================================================
   Export Functions (.docx, .txt, .srt, Clipboard)
   ========================================================== */

// 1. Export as Word (.docx)
async function exportDocx() {
    if (!state.transcript || !state.transcript.items || state.transcript.items.length === 0) {
        showAlert('Dışa aktarılacak transkript bulunamadı.');
        return;
    }

    try {
        const btn = elements.downloadDocxBtn;
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Oluşturuluyor...';
        btn.disabled = true;

        const payload = {
            title: state.transcript.title || state.metadata.title,
            author: state.transcript.author || state.metadata.author,
            videoUrl: state.currentVideoUrl,
            languageName: state.transcript.languageName,
            items: state.transcript.items
        };

        const res = await fetch('/api/transcript/export-docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Word dosyası oluşturulamadı.');
        }

        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        const safeTitle = (state.transcript.title || 'transkript')
            .replace(/[/\\?%*:|"<>]/g, '-')
            .substring(0, 40);
        a.download = `${safeTitle}_transkript.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        showToast('Word (.docx) belgesi başarıyla indirildi!');
        btn.querySelector('span').textContent = originalText;
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        showAlert(err.message || 'Word dosyası indirilirken hata oluştu.');
        elements.downloadDocxBtn.disabled = false;
    }
}

// 2. Copy to Clipboard
function copyTranscriptToClipboard() {
    if (!state.transcript || !state.transcript.items) return;

    const formatted = state.transcript.items
        .map(i => `[${i.timestampFormatted}] ${i.text}`)
        .join('\n');

    navigator.clipboard.writeText(formatted).then(() => {
        showToast('Zaman damgalı transkript panoya kopyalandı!');
    }).catch(() => {
        showAlert('Panoya kopyalanamadı.');
    });
}

// 3. Download TXT
function exportTxt() {
    if (!state.transcript || !state.transcript.items) return;

    let content = `========================================================\n`;
    content += `YouTube Video Transkripti\n`;
    content += `Başlık: ${state.transcript.title}\n`;
    content += `Kanal: ${state.transcript.author}\n`;
    content += `Dil: ${state.transcript.languageName}\n`;
    content += `Link: ${state.currentVideoUrl}\n`;
    content += `Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
    content += `========================================================\n\n`;

    content += state.transcript.items
        .map(i => `[${i.timestampFormatted}] ${i.text}`)
        .join('\n\n');

    downloadBlob(content, 'text/plain;charset=utf-8', `${sanitizeFileName(state.transcript.title)}_transkript.txt`);
    showToast('TXT dosyası indirildi!');
}

// 4. Download SRT Subtitle File
function exportSrt() {
    if (!state.transcript || !state.transcript.items) return;

    let srtContent = '';
    state.transcript.items.forEach((item, index) => {
        const startSec = item.offsetSeconds;
        const endSec = startSec + item.durationSeconds;

        srtContent += `${index + 1}\n`;
        srtContent += `${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n`;
        srtContent += `${item.text}\n\n`;
    });

    downloadBlob(srtContent, 'text/plain;charset=utf-8', `${sanitizeFileName(state.transcript.title)}.srt`);
    showToast('SRT altyazı dosyası indirildi!');
}

/* ==========================================================
   Utility Helpers
   ========================================================= */
function downloadBlob(content, mimeType, fileName) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function formatTimeSpan(totalSeconds) {
    const sec = Math.floor(totalSeconds || 0);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    if (hrs > 0) {
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatSrtTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 1000);

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function sanitizeFileName(title) {
    return (title || 'transkript')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .substring(0, 40);
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
