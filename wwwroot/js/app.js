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
    playbackSpeed: 1,
    repeatIndex: -1
};

// DOM Elements
const elements = {
    themeToggle: document.getElementById('themeToggleTranscript'),
    settingsBtn: document.getElementById('settingsBtnTranscript'),
    modalThemeToggleBtn: document.getElementById('modalThemeToggleBtn'),
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
    zenModeBtn: document.getElementById('zenModeBtn'),
    transcriptToolbar: document.getElementById('transcriptToolbar'),
    transcriptSearch: document.getElementById('transcriptSearch'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    autoScrollToggle: document.getElementById('autoScrollToggle'),
    transcriptList: document.getElementById('transcriptList'),
    itemCountBadge: document.getElementById('itemCountBadge'),
    transcriptFooter: document.getElementById('transcriptFooter'),
    
    // Export buttons
    downloadDocxBtn: document.getElementById('downloadDocxBtn'),
    copyTranscriptBtn: document.getElementById('copyTranscriptBtn'),
    downloadTxtBtn: document.getElementById('downloadTxtBtn'),
    downloadSrtBtn: document.getElementById('downloadSrtBtn'),

    // Dictionary Pop-up Modal (Tasarım 1)
    dictTooltip: document.getElementById('dictTooltip'),
    dictWord: document.getElementById('dictWord'),
    dictPhonetic: document.getElementById('dictPhonetic'),
    dictSpeakBtn: document.getElementById('dictSpeakBtn'),
    dictLangTag: document.getElementById('dictLangTag'),
    dictCloseBtn: document.getElementById('dictCloseBtn'),
    dictBody: document.getElementById('dictBody'),
    dictCopyBtn: document.getElementById('dictCopyBtn'),
    dictHint: document.getElementById('dictHint')
};

/* ==========================================================
   Initialization & Theme Management
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    setupVideoControlsEvents();
    setupKeyboardShortcuts();
    setupDictionaryEvents();
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
    updateModalThemeIcons();
}

function updateModalThemeIcons() {
    if (elements.modalThemeToggleBtn) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const sunIcon = elements.modalThemeToggleBtn.querySelector('.sun');
        const moonIcon = elements.modalThemeToggleBtn.querySelector('.moon');
        const textSpan = elements.modalThemeToggleBtn.querySelector('#modalThemeToggleText');
        if (currentTheme === 'dark') {
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
            if (textSpan) textSpan.textContent = 'Gündüz Moduna Geç';
        } else {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
            if (textSpan) textSpan.textContent = 'Gece Moduna Geç';
        }
    }
}

function toggleZenMode() {
    document.body.classList.toggle('zen-mode-active');
    
    if (elements.zenModeBtn) {
        const span = elements.zenModeBtn.querySelector('span');
        if (span) {
            if (document.body.classList.contains('zen-mode-active')) {
                span.textContent = 'Normal Görünüm';
            } else {
                span.textContent = 'Zen Modu';
            }
        }
    }
}

/* ==========================================================
   Event Listeners Setup
   ========================================================== */
function setupEventListeners() {
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (elements.modalThemeToggleBtn) {
        elements.modalThemeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Zen Mode toggle
    if (elements.zenModeBtn) {
        elements.zenModeBtn.addEventListener('click', toggleZenMode);
    }

    // Settings Modal
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', openSettingsModal);
    }
    
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

    // Transcript Item Events (Event Delegation)
    elements.transcriptList.addEventListener('click', handleTranscriptListClick);

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
        } else if (e.key === 'Escape') {
            if (document.body.classList.contains('zen-mode-active')) {
                e.preventDefault();
                toggleZenMode();
            }
        }
    });
}

/* ==========================================================
   Settings Modal Logic
   ========================================================== */
function openSettingsModal() {
    elements.aiProviderSelect.value = localStorage.getItem('transkript_ai_provider') || 'Gemini';
    elements.aiApiKeyInput.value = localStorage.getItem('transkript_ai_apikey') || '';
    updateModalThemeIcons();
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
   Translation (On-Demand - Free Google Translate)
   ========================================================== */
async function handleTranscriptListClick(e) {
    const btnRepeat = e.target.closest('.btn-repeat');
    if (btnRepeat) {
        e.stopPropagation();
        const index = parseInt(btnRepeat.getAttribute('data-index'));
        
        if (state.repeatIndex === index) {
            // Cancel repeat
            state.repeatIndex = -1;
            btnRepeat.classList.remove('active');
        } else {
            // Enable repeat
            const prev = elements.transcriptList.querySelector('.btn-repeat.active');
            if (prev) prev.classList.remove('active');
            
            state.repeatIndex = index;
            btnRepeat.classList.add('active');
            
            // Seek to start of this item immediately
            if (state.transcript && state.transcript.items[index]) {
                seekVideoTo(state.transcript.items[index].offsetSeconds);
            }
        }
        return;
    }

    const btn = e.target.closest('.btn-translate');
    if (!btn) {
        // If it's not the translate button, it might be a click on the item to seek video
        const itemEl = e.target.closest('.transcript-item');
        if (itemEl && !e.target.closest('.translation-result')) {
            seekVideoTo(parseFloat(itemEl.getAttribute('data-offset')));
        }
        return;
    }

    e.stopPropagation();

    const itemWrapper = btn.closest('.item-content-wrapper');
    let resultBox = itemWrapper.querySelector('.translation-result');

    // Toggle if already exists
    if (resultBox) {
        resultBox.style.display = resultBox.style.display === 'none' ? 'block' : 'none';
        return;
    }

    const textToTranslate = btn.getAttribute('data-text');
    if (!textToTranslate) return;

    // Create result box and show loading state
    resultBox = document.createElement('div');
    resultBox.className = 'translation-result';
    resultBox.innerHTML = '<span style="opacity: 0.7;">Çevriliyor...</span>';
    itemWrapper.appendChild(resultBox);
    btn.style.opacity = '1';
    btn.disabled = true;

    try {
        const res = await fetch('/api/transcript/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                TextToTranslate: textToTranslate,
                TargetLanguage: 'tr'
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Çeviri başarısız oldu.');
        }

        resultBox.innerHTML = escapeHtml(data.data);
    } catch (err) {
        console.error('Translation Error:', err);
        resultBox.innerHTML = `<span style="color: #ef4444;">Hata: ${escapeHtml(err.message)}</span>`;
    } finally {
        btn.disabled = false;
        btn.style.opacity = '';
    }
}

/* ==========================================================
   Word Meaning / Quick Dictionary Pop-up (Tasarım 1)
   ========================================================== */
let currentDictData = null;
let currentAudioObj = null;

function setupDictionaryEvents() {
    // 1. Right Click (contextmenu) on transcript list
    if (elements.transcriptList) {
        elements.transcriptList.addEventListener('contextmenu', handleContextMenuLookup);
    }

    // 2. Close buttons & dismissal triggers
    if (elements.dictCloseBtn) {
        elements.dictCloseBtn.addEventListener('click', closeDictionaryTooltip);
    }

    // Dismiss on click outside
    document.addEventListener('mousedown', (e) => {
        if (elements.dictTooltip && elements.dictTooltip.style.display !== 'none' && !elements.dictTooltip.contains(e.target)) {
            closeDictionaryTooltip();
        }
    });

    // Dismiss on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.dictTooltip && elements.dictTooltip.style.display !== 'none') {
            closeDictionaryTooltip();
        }
    });

    // 3. Audio Pronunciation Button
    if (elements.dictSpeakBtn) {
        elements.dictSpeakBtn.addEventListener('click', () => {
            if (!currentDictData || !currentDictData.word) return;
            speakWord(currentDictData.word, currentDictData.sourceLanguage || 'en', currentDictData.audioUrl);
        });
    }

    // 4. Copy Translation Button
    if (elements.dictCopyBtn) {
        elements.dictCopyBtn.addEventListener('click', () => {
            if (!currentDictData) return;
            const textToCopy = `${currentDictData.word} → ${currentDictData.primaryTranslation}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const btnSpan = elements.dictCopyBtn.querySelector('span');
                if (btnSpan) {
                    const prev = btnSpan.textContent;
                    btnSpan.textContent = 'Kopyalandı!';
                    setTimeout(() => { btnSpan.textContent = prev; }, 1600);
                }
            }).catch(() => {
                showToast('Panoya kopyalandı.');
            });
        });
    }
}

function handleContextMenuLookup(e) {
    if (!elements.transcriptList || !elements.transcriptList.contains(e.target)) return;

    let targetWord = '';

    // 1. Check if the user has actively selected text with the cursor
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        if (elements.transcriptList.contains(range.commonAncestorContainer)) {
            const selectedText = sel.toString().trim();
            if (selectedText.length > 0 && selectedText.length < 80) {
                targetWord = selectedText;
            }
        }
    }

    // 2. If no text selected, check if user clicked directly on a word token element
    if (!targetWord) {
        const wordEl = e.target.closest('.transcript-word');
        if (wordEl) {
            targetWord = wordEl.getAttribute('data-word') || wordEl.textContent || '';
        }
    }

    // 3. Fallback: inspect caret coordinates and DOM text nodes
    if (!targetWord) {
        const transcriptItem = e.target.closest('.transcript-item');
        if (transcriptItem) {
            targetWord = getWordAtPoint(e.clientX, e.clientY);
        }
    }

    // 4. Final fallback: extract nearest word from e.target textContent if inside transcript
    if (!targetWord && e.target) {
        const text = e.target.textContent || '';
        const words = text.match(/[\p{L}\p{N}_'-]+/gu);
        if (words && words.length === 1) {
            targetWord = words[0];
        }
    }

    if (targetWord && targetWord.trim().length > 0) {
        // Clean outer punctuation and formatting quotes
        const cleanWord = targetWord.trim().replace(/^['"\-.,!?;:()\[\]{}«»“”]+|['"\-.,!?;:()\[\]{}«»“”]+$/g, '');
        if (cleanWord.length > 0) {
            e.preventDefault(); // Prevent standard browser context menu
            e.stopPropagation();
            openDictionaryLookup(cleanWord, e.clientX, e.clientY);
        }
    }
}

function getWordAtPoint(x, y) {
    let textNode = null;
    let offset = 0;

    // 1. Try caretPositionFromPoint (Standard / Firefox / Chrome 129+)
    if (document.caretPositionFromPoint) {
        try {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos && pos.offsetNode) {
                if (pos.offsetNode.nodeType === Node.TEXT_NODE) {
                    textNode = pos.offsetNode;
                    offset = pos.offset;
                } else if (pos.offsetNode.nodeType === Node.ELEMENT_NODE) {
                    const children = pos.offsetNode.childNodes;
                    if (pos.offset < children.length && children[pos.offset].nodeType === Node.TEXT_NODE) {
                        textNode = children[pos.offset];
                        offset = 0;
                    } else if (pos.offsetNode.firstChild && pos.offsetNode.firstChild.nodeType === Node.TEXT_NODE) {
                        textNode = pos.offsetNode.firstChild;
                        offset = 0;
                    }
                }
            }
        } catch (e) {}
    }

    // 2. Try caretRangeFromPoint (WebKit / Safari / Older Chromium)
    if (!textNode && document.caretRangeFromPoint) {
        try {
            const range = document.caretRangeFromPoint(x, y);
            if (range && range.startContainer) {
                if (range.startContainer.nodeType === Node.TEXT_NODE) {
                    textNode = range.startContainer;
                    offset = range.startOffset;
                } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
                    const children = range.startContainer.childNodes;
                    if (range.startOffset < children.length && children[range.startOffset].nodeType === Node.TEXT_NODE) {
                        textNode = children[range.startOffset];
                        offset = 0;
                    } else if (range.startContainer.firstChild && range.startContainer.firstChild.nodeType === Node.TEXT_NODE) {
                        textNode = range.startContainer.firstChild;
                        offset = 0;
                    }
                }
            }
        } catch (e) {}
    }

    if (!textNode || !textNode.textContent) return '';

    const text = textNode.textContent;
    if (offset < 0 || offset > text.length) return '';

    let start = offset;
    let end = offset;

    // If offset is boundary/space, adjust start/end if adjacent is a word character
    if (start >= text.length || !/[\p{L}\p{N}_'-]/u.test(text[start])) {
        if (start > 0 && /[\p{L}\p{N}_'-]/u.test(text[start - 1])) {
            start--;
            end = start;
        }
    }

    // Expand backwards across letters, numbers, apostrophes, hyphens
    while (start > 0 && /[\p{L}\p{N}_'-]/u.test(text[start - 1])) {
        start--;
    }
    // Expand forwards
    while (end < text.length && /[\p{L}\p{N}_'-]/u.test(text[end])) {
        end++;
    }

    return text.slice(start, end).trim();
}

async function openDictionaryLookup(word, x, y) {
    if (!elements.dictTooltip) return;

    elements.dictWord.textContent = word;
    if (elements.dictPhonetic) {
        elements.dictPhonetic.style.display = 'none';
        elements.dictPhonetic.textContent = '';
    }
    elements.dictLangTag.textContent = 'EN → TR';
    elements.dictBody.innerHTML = `
        <div class="dict-skeleton">
            <div class="dict-skeleton-line title"></div>
            <div class="dict-skeleton-line badge"></div>
            <div class="dict-skeleton-line"></div>
            <div class="dict-skeleton-line short"></div>
        </div>
    `;

    positionDictionaryTooltip(x, y);

    try {
        const res = await fetch('/api/dictionary/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Word: word,
                TargetLanguage: 'tr'
            })
        });

        const data = await res.json();
        if (!res.ok || (data.success === false && data.message && !data.primaryTranslation)) {
            throw new Error(data.message || 'Sözlükte anlam bulunamadı.');
        }

        currentDictData = data;
        renderDictionaryData(data);
        positionDictionaryTooltip(x, y);
    } catch (err) {
        console.error('Dictionary Lookup Error:', err);
        elements.dictBody.innerHTML = `
            <div style="padding: 1rem 0; color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                <span>❌</span>
                <span>Anlam bulunamadı: ${escapeHtml(err.message)}</span>
            </div>
        `;
        positionDictionaryTooltip(x, y);
    }
}

function renderDictionaryData(data) {
    elements.dictWord.textContent = data.word || '';
    
    // Phonetic Badge
    if (elements.dictPhonetic) {
        if (data.phonetic && data.phonetic.trim()) {
            elements.dictPhonetic.textContent = data.phonetic.trim();
            elements.dictPhonetic.style.display = 'inline-block';
        } else {
            elements.dictPhonetic.style.display = 'none';
        }
    }

    const srcLang = (data.sourceLanguage || 'en').toUpperCase();
    const tgtLang = (data.targetLanguage || 'tr').toUpperCase();
    elements.dictLangTag.textContent = `${srcLang} → ${tgtLang}`;

    let html = '';

    // 1. Primary Translation Box (Large & Prominent)
    if (data.primaryTranslation) {
        html += `
            <div class="dict-primary-box">
                <div class="dict-primary-label">Türkçe Karşılığı</div>
                <div class="dict-primary-text">${escapeHtml(data.primaryTranslation)}</div>
                ${data.message ? `<div class="dict-root-hint">💡 ${escapeHtml(data.message)}</div>` : ''}
            </div>
        `;
    }

    // 2. Entries by Part of Speech
    if (data.entries && data.entries.length > 0) {
        data.entries.forEach(entry => {
            const posTitle = entry.partOfSpeechTr || entry.partOfSpeech || 'Kelime';
            const posKey = (entry.partOfSpeech || '').toLowerCase().replace(/[^a-z]/g, '');
            const posTrKey = (entry.partOfSpeechTr || '').toLowerCase().replace(/[^a-zçğıöşü]/g, '');
            const posBadgeClass = `dict-pos-badge pos-${posKey} pos-${posTrKey}`;

            html += `
                <div class="dict-pos-section">
                    <div class="dict-pos-header">
                        <span class="${posBadgeClass}">${escapeHtml(posTitle)}</span>
                        ${entry.partOfSpeech && entry.partOfSpeech.toLowerCase() !== (entry.partOfSpeechTr || '').toLowerCase() ? `<span class="dict-pos-name-en">(${escapeHtml(entry.partOfSpeech)})</span>` : ''}
                    </div>
            `;

            // Meanings / Turkish Equivalents
            if (entry.meanings && entry.meanings.length > 0) {
                html += `<div class="dict-meanings-wrap">`;
                entry.meanings.forEach(m => {
                    html += `<span class="dict-meaning-chip">${escapeHtml(m)}</span>`;
                });
                html += `</div>`;
            }

            // Definitions (English explanation + example)
            if (entry.definitions && entry.definitions.length > 0) {
                html += `<div class="dict-defs-wrap">`;
                entry.definitions.forEach(def => {
                    if (def.definition) {
                        html += `
                            <div class="dict-def-item">
                                <div>${escapeHtml(def.definition)}</div>
                                ${def.example ? `<div class="dict-def-example">"${escapeHtml(def.example)}"</div>` : ''}
                            </div>
                        `;
                    }
                });
                html += `</div>`;
            }

            // Synonyms
            if (entry.synonyms && entry.synonyms.length > 0) {
                html += `
                    <div class="dict-synonyms-wrap">
                        <span class="dict-syn-label">Eş Anlamlı:</span>
                        ${entry.synonyms.map(s => `<span class="dict-syn-chip">${escapeHtml(s)}</span>`).join('')}
                    </div>
                `;
            }

            html += `</div>`;
        });
    }

    // 3. Context Examples
    if (data.examples && data.examples.length > 0) {
        html += `
            <div class="dict-examples-box">
                <div class="dict-examples-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    Örnek Cümleler
                </div>
                ${data.examples.map(ex => `<div class="dict-example-item">• ${highlightWordInExample(ex, data.word)}</div>`).join('')}
            </div>
        `;
    }

    elements.dictBody.innerHTML = html;
}

function highlightWordInExample(sentence, word) {
    if (!word || !sentence) return escapeHtml(sentence);
    const escapedSent = escapeHtml(sentence);
    const reg = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');
    return escapedSent.replace(reg, '<mark>$1</mark>');
}

function positionDictionaryTooltip(x, y) {
    const tooltip = elements.dictTooltip;
    if (!tooltip) return;

    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'flex';

    // Measure element
    const rect = tooltip.getBoundingClientRect();
    const width = rect.width || 560;
    const height = rect.height || 420;

    const margin = 16;
    let left = x + 14;
    let top = y + 14;

    // Check right overflow
    if (left + width > window.innerWidth - margin) {
        left = x - width - 14;
    }
    // Check left overflow
    if (left < margin) {
        left = margin;
    }

    // Check bottom overflow
    if (top + height > window.innerHeight - margin) {
        top = y - height - 14;
    }
    // Check top overflow
    if (top < margin) {
        top = margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = 'visible';
}

function closeDictionaryTooltip() {
    if (elements.dictTooltip) {
        elements.dictTooltip.style.display = 'none';
    }
    if (currentAudioObj) {
        try { currentAudioObj.pause(); } catch(e) {}
        currentAudioObj = null;
    }
    if (elements.dictSpeakBtn) {
        elements.dictSpeakBtn.classList.remove('playing');
    }
    currentDictData = null;
}

function speakWord(text, lang = 'en', audioUrl = null) {
    if (elements.dictSpeakBtn) {
        elements.dictSpeakBtn.classList.add('playing');
    }

    // 1. If human recording audioUrl exists, try playing it
    if (audioUrl && audioUrl.startsWith('http')) {
        try {
            if (currentAudioObj) {
                currentAudioObj.pause();
            }
            currentAudioObj = new Audio(audioUrl);
            currentAudioObj.play().then(() => {
                currentAudioObj.onended = () => {
                    if (elements.dictSpeakBtn) elements.dictSpeakBtn.classList.remove('playing');
                };
            }).catch(() => {
                // Fallback to Web Speech Synthesis
                playSpeechSynthesis(text, lang);
            });
            return;
        } catch (e) {
            // Fallback to SpeechSynthesis
        }
    }

    playSpeechSynthesis(text, lang);
}

function playSpeechSynthesis(text, lang = 'en') {
    if (!('speechSynthesis' in window)) {
        if (elements.dictSpeakBtn) elements.dictSpeakBtn.classList.remove('playing');
        return;
    }

    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang.toLowerCase() === 'tr' ? 'tr-TR' : 'en-US';
        utterance.rate = 0.9;
        
        utterance.onend = () => {
            if (elements.dictSpeakBtn) elements.dictSpeakBtn.classList.remove('playing');
        };
        utterance.onerror = () => {
            if (elements.dictSpeakBtn) elements.dictSpeakBtn.classList.remove('playing');
        };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Speech synthesis error:', e);
        if (elements.dictSpeakBtn) elements.dictSpeakBtn.classList.remove('playing');
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
        document.body.classList.add('video-active');
        elements.workspaceSection.style.display = 'grid';

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

        const formattedContent = formatTranscriptWords(text, query);

        itemEl.innerHTML = `
            <span class="item-timestamp">${item.timestampFormatted}</span>
            <div class="item-content-wrapper" style="flex: 1; display: flex; flex-direction: column;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
                    <span class="item-text" style="flex: 1;">${formattedContent}</span>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="btn-translate" title="Türkçeye Çevir" data-text="${escapeHtml(text)}">🌐</button>
                        <button class="btn-repeat ${index === state.repeatIndex ? 'active' : ''}" title="Sürekli Tekrarla" data-index="${index}">🔁</button>
                    </div>
                </div>
            </div>
        `;

        elements.transcriptList.appendChild(itemEl);
    });

    elements.itemCountBadge.textContent = query 
        ? `${matchCount} / ${items.length} sonuç` 
        : `${items.length} satır`;
}

function formatTranscriptWords(text, query) {
    if (!text) return '';

    // Split text into word tokens and delimiters (whitespace, punctuation)
    const tokens = text.split(/([^\p{L}\p{N}_'-]+)/u);
    return tokens.map(token => {
        if (!token) return '';
        // If delimiter (spaces, punctuation)
        if (!/[\p{L}\p{N}]/u.test(token)) {
            return escapeHtml(token);
        }

        let innerContent = escapeHtml(token);
        if (query && !query.includes(' ')) {
            const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
            innerContent = innerContent.replace(regex, '<mark class="search-hit">$1</mark>');
        }

        const cleanWord = token.replace(/^['"\-.,!?;:()\[\]{}«»“”]+|['"\-.,!?;:()\[\]{}«»“”]+$/g, '');
        return `<span class="transcript-word" data-word="${escapeHtml(cleanWord)}">${innerContent}</span>`;
    }).join('');
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
    
    // Handle Single Line Repeat Logic
    if (state.repeatIndex !== -1 && items[state.repeatIndex]) {
        const repeatItem = items[state.repeatIndex];
        const nextItem = items[state.repeatIndex + 1];
        const start = repeatItem.offsetSeconds;
        // Default to item duration, or use next item's start time if available
        const end = nextItem ? nextItem.offsetSeconds : (start + repeatItem.durationSeconds);
        
        // If we reached or passed the end of the line (or seeked far away manually), loop back to start
        if (currentTime >= end || currentTime < start - 1.0) {
            seekVideoTo(start);
        }
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
                block: 'center'
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
