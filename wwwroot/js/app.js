/**
 * Transkript Okuyucu - Main Application Bootstrap & Controller
 */
import { state } from './state.js';
import { debounce, escapeHtml, showAlert, hideAlert, showToast } from './utils.js';
import {
    mountYouTubePlayer,
    registerSyncLoopCallback,
    togglePlayPause,
    seekRelative,
    toggleMute,
    toggleFullscreen
} from './player.js';
import {
    initTranscriptEvents,
    renderTranscriptItems,
    syncTranscriptWithPlayback,
    navigateSearchMatch,
    resumeAutoScroll,
    hideScrollPausedIndicator
} from './transcript.js';
import { setupDictionaryEvents, closeDictionaryTooltip } from './dictionary.js';
import { setupVocabListEvents } from './vocab.js';
import { setupHistoryEvents } from './history.js';
import {
    exportDocx,
    exportTxt,
    exportSrt
} from './export.js';

/* ==========================================================
   Initialization
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupDictionaryEvents();
    setupVocabListEvents();
    setupHistoryEvents();
    initTranscriptEvents();

    // Register live sync callback to run inside player timer loop
    registerSyncLoopCallback(syncTranscriptWithPlayback);
});

/* ==========================================================
   Theme Management
   ========================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('transkript_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    document.body.classList.add('no-transitions');
    void document.body.offsetHeight; // Force reflow

    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('transkript_theme', newTheme);

    void document.body.offsetHeight; // Force reflow again
    document.body.classList.remove('no-transitions');
}

/* ==========================================================
   Zen Mode (Reading Mode)
   ========================================================== */
function toggleZenMode() {
    document.body.classList.add('no-transitions');
    void document.body.offsetHeight;

    document.body.classList.toggle('zen-mode-active');
    
    void document.body.offsetHeight;
    document.body.classList.remove('no-transitions');

    const zenModeBtn = document.getElementById('zenModeBtn');
    
    if (zenModeBtn) {
        const span = zenModeBtn.querySelector('span');
        if (span) {
            span.textContent = document.body.classList.contains('zen-mode-active') ? 'Normal Mod' : 'Zen Modu';
        }
    }
}

/* ==========================================================
   Modals (Shortcuts Help)
   ========================================================== */
function openShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'flex';
}

function closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'none';
}

/* ==========================================================
   Event Listeners Setup
   ========================================================== */
function setupEventListeners() {
    // Theme toggles
    const themeToggle = document.getElementById('themeToggleTranscript');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Zen Mode toggle
    const zenModeBtn = document.getElementById('zenModeBtn');
    if (zenModeBtn) zenModeBtn.addEventListener('click', toggleZenMode);
    // Shortcuts Modal (1.e)
    const shortcutsBtn = document.getElementById('shortcutsBtnTranscript');
    const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    const shortcutsModal = document.getElementById('shortcutsModal');

    if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcutsModal);
    if (closeShortcutsBtn) closeShortcutsBtn.addEventListener('click', closeShortcutsModal);
    if (shortcutsModal) {
        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) closeShortcutsModal();
        });
    }

    // Paste button
    const pasteBtn = document.getElementById('pasteBtn');
    const videoUrlInput = document.getElementById('videoUrlInput');
    if (pasteBtn && videoUrlInput) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    videoUrlInput.value = text.trim();
                    videoUrlInput.focus();
                }
            } catch (err) {
                videoUrlInput.focus();
            }
        });
    }

    // Form Submit (Fetch Video & Transcript)
    const urlForm = document.getElementById('urlForm');
    if (urlForm) {
        urlForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const url = videoUrlInput ? videoUrlInput.value.trim() : '';
            if (url) {
                loadVideoAndTranscript(url);
            }
        });
    }

    // Language Change
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            const selectedOption = languageSelect.selectedOptions[0];
            if (!selectedOption) return;

            const langCode = selectedOption.value;
            const isAuto = selectedOption.getAttribute('data-auto') === 'true';
            fetchTranscriptForLanguage(state.currentVideoUrl, langCode, isAuto);
        });
    }

    // Search filter with 150ms Debounce (1.c & 3.b)
    const transcriptSearch = document.getElementById('transcriptSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchNavGroup = document.getElementById('searchNavGroup');
    const prevSearchBtn = document.getElementById('prevSearchBtn');
    const nextSearchBtn = document.getElementById('nextSearchBtn');

    const debouncedSearch = debounce((query) => {
        state.searchQuery = query;
        if (clearSearchBtn) clearSearchBtn.style.display = query ? 'block' : 'none';
        if (searchNavGroup) searchNavGroup.style.display = query ? 'flex' : 'none';
        renderTranscriptItems();
    }, 300);

    if (transcriptSearch) {
        transcriptSearch.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim().toLowerCase());
        });

        // Enter: Next Match, Shift+Enter: Previous Match
        transcriptSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                navigateSearchMatch(e.shiftKey ? -1 : 1);
            }
        });
    }

    if (clearSearchBtn && transcriptSearch) {
        clearSearchBtn.addEventListener('click', () => {
            transcriptSearch.value = '';
            state.searchQuery = '';
            clearSearchBtn.style.display = 'none';
            if (searchNavGroup) searchNavGroup.style.display = 'none';
            renderTranscriptItems();
        });
    }

    if (prevSearchBtn) {
        prevSearchBtn.addEventListener('click', () => navigateSearchMatch(-1));
    }
    if (nextSearchBtn) {
        nextSearchBtn.addEventListener('click', () => navigateSearchMatch(1));
    }

    // Alert Close Button
    const alertBox = document.getElementById('alertBox');
    if (alertBox) {
        const closeBtn = alertBox.querySelector('.alert-close');
        if (closeBtn) closeBtn.addEventListener('click', hideAlert);
    }

    // Export Actions
    const downloadDocxBtn = document.getElementById('downloadDocxBtn');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadSrtBtn = document.getElementById('downloadSrtBtn');

    if (downloadDocxBtn) downloadDocxBtn.addEventListener('click', exportDocx);
    if (downloadTxtBtn) downloadTxtBtn.addEventListener('click', exportTxt);
    if (downloadSrtBtn) downloadSrtBtn.addEventListener('click', exportSrt);

    // Auto-Scroll Toggle Switch Listener
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    if (autoScrollToggle) {
        autoScrollToggle.addEventListener('change', () => {
            if (autoScrollToggle.checked) {
                resumeAutoScroll();
            } else {
                state.isUserScrolling = false;
                hideScrollPausedIndicator();
            }
        });
    }
}

/* ==========================================================
   Global Keyboard Shortcuts
   ========================================================== */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore typing in input/textarea/select
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
            if (e.key === 'Escape') {
                document.activeElement.blur();
            }
            return;
        }

        // Close modals on ESC
        if (e.key === 'Escape') {
            closeShortcutsModal();
            closeDictionaryTooltip();
            return;
        }

        // Space or 'k': Play / Pause
        if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            togglePlayPause();
            return;
        }

        // Left Arrow or 'j': -10s
        if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
            e.preventDefault();
            seekRelative(-10);
            return;
        }

        // Right Arrow or 'l': +10s
        if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            seekRelative(10);
            return;
        }

        // 'm': Mute toggle
        if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            toggleMute();
            return;
        }

        // 'f': Fullscreen toggle
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFullscreen();
            return;
        }

        // '?': Open shortcuts modal
        if (e.key === '?') {
            e.preventDefault();
            openShortcutsModal();
            return;
        }

        // Ctrl+Shift+S / Cmd+Shift+S (or Ctrl+Alt+S / Cmd+Alt+S): Toggle Auto-Scroll
        const isModifierHeld = e.ctrlKey || e.metaKey;
        const isSecondaryModifierHeld = e.shiftKey || e.altKey;
        const isKeyS = e.code === 'KeyS' || (e.key && e.key.toLowerCase() === 's');

        if (isModifierHeld && isSecondaryModifierHeld && isKeyS) {
            e.preventDefault();
            const autoScrollToggle = document.getElementById('autoScrollToggle');
            if (autoScrollToggle) {
                autoScrollToggle.checked = !autoScrollToggle.checked;
                showToast(autoScrollToggle.checked ? 'Oto-kaydırma Açıldı' : 'Oto-kaydırma Kapatıldı');
                
                if (autoScrollToggle.checked) {
                    resumeAutoScroll();
                } else {
                    state.isUserScrolling = false;
                    hideScrollPausedIndicator();
                }
            }
            return;
        }

        // Ctrl+Shift+Z / Cmd+Shift+Z (or Ctrl+Alt+Z / Cmd+Alt+Z / Alt+Z): Toggle Zen Mode
        const isKeyZ = e.code === 'KeyZ' || (e.key && e.key.toLowerCase() === 'z');
        if ((isModifierHeld && (e.shiftKey || e.altKey) && isKeyZ) || (!isModifierHeld && e.altKey && isKeyZ)) {
            e.preventDefault();
            toggleZenMode();
            const isZen = document.body.classList.contains('zen-mode-active');
            showToast(isZen ? 'Zen Modu Açıldı' : 'Zen Modu Kapatıldı');
            return;
        }
    });
}

/* ==========================================================
   Data Fetching & Video Loading
   ========================================================== */
async function loadVideoAndTranscript(url) {
    hideAlert();
    setLoading(true);
    resetTranscriptState();

    try {
        // 1. Fetch Video Metadata
        const metaRes = await fetch('/api/video/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Url: url })
        });

        const metaData = await metaRes.json();
        if (!metaRes.ok || !metaData.success) {
            throw new Error(metaData.message || 'Video bilgileri alınamadı.');
        }

        state.metadata = metaData.data;
        state.currentVideoUrl = url;
        state.currentVideoId = metaData.data.id;

        // Render Video Info
        const videoTitle = document.getElementById('videoTitle');
        const videoAuthor = document.getElementById('videoAuthor');
        const videoDuration = document.getElementById('videoDuration');
        const videoSourceLink = document.getElementById('videoSourceLink');
        const workspaceSection = document.getElementById('workspaceSection');

        if (videoTitle) videoTitle.textContent = metaData.data.title;
        if (videoAuthor) videoAuthor.textContent = metaData.data.author;
        if (videoDuration) videoDuration.textContent = metaData.data.duration || '00:00';
        if (videoSourceLink) videoSourceLink.href = `https://www.youtube.com/watch?v=${metaData.data.id}`;

        populateLanguageSelect(metaData.data.availableTracks || []);
        mountYouTubePlayer(metaData.data.id);

        // Check if there is a pending timestamp to seek to (from History)
        // Handled securely in player.js onReady event

        // 2. Fetch Default Transcript
        await fetchTranscriptForLanguage(url);
    } catch (err) {
        console.error(err);
        showAlert(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
        setLoading(false);
    }
}

async function fetchTranscriptForLanguage(url, langCode = null, isAuto = null) {
    try {
        const payload = { Url: url };
        if (langCode) payload.LanguageCode = langCode;
        if (isAuto !== null) payload.IsAutoGenerated = isAuto;

        const res = await fetch('/api/transcript/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Transkript alınamadı.');
        }

        state.transcript = data.data;

        // Sync Language selector
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && data.data.languageCode) {
            for (let opt of languageSelect.options) {
                if (opt.value === data.data.languageCode) {
                    opt.selected = true;
                    break;
                }
            }
        }

        renderTranscriptItems();
    } catch (err) {
        console.error(err);
        showAlert(err.message || 'Transkript yüklenirken hata oluştu.');
    }
}

function populateLanguageSelect(tracks) {
    const languageSelect = document.getElementById('languageSelect');
    const langSelectorWrapper = document.getElementById('langSelectorWrapper');
    if (!languageSelect) return;

    languageSelect.innerHTML = '';

    if (!tracks || tracks.length === 0) {
        if (langSelectorWrapper) langSelectorWrapper.style.display = 'none';
        return;
    }

    if (langSelectorWrapper) langSelectorWrapper.style.display = 'flex';

    tracks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.languageCode;
        opt.setAttribute('data-auto', t.isAutoGenerated ? 'true' : 'false');
        opt.textContent = `${t.languageName}${t.isAutoGenerated ? ' (Otomatik)' : ''}`;
        languageSelect.appendChild(opt);
    });
}

function resetTranscriptState() {
    state.transcript = null;
    state.activeItemIndex = -1;
    state.repeatIndex = -1;
    state.searchQuery = '';
    state.searchMatchIndices = [];
    state.currentSearchMatchIndex = -1;

    const transcriptSearch = document.getElementById('transcriptSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchNavGroup = document.getElementById('searchNavGroup');
    const transcriptList = document.getElementById('transcriptList');
    const itemCountBadge = document.getElementById('itemCountBadge');

    if (transcriptSearch) transcriptSearch.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (searchNavGroup) searchNavGroup.style.display = 'none';
    if (transcriptList) transcriptList.innerHTML = '';
    if (itemCountBadge) itemCountBadge.textContent = '0 satır';
}

function setLoading(isLoading) {
    const fetchBtn = document.getElementById('fetchBtn');
    if (!fetchBtn) return;

    const btnText = fetchBtn.querySelector('.btn-text');
    const spinner = fetchBtn.querySelector('.btn-spinner');
    const arrow = fetchBtn.querySelector('.btn-arrow');

    if (isLoading) {
        fetchBtn.disabled = true;
        if (btnText) btnText.textContent = 'Yükleniyor...';
        if (spinner) spinner.style.display = 'inline-block';
        if (arrow) arrow.style.display = 'none';
    } else {
        fetchBtn.disabled = false;
        if (btnText) btnText.textContent = 'Transkripti Getir';
        if (spinner) spinner.style.display = 'none';
        if (arrow) arrow.style.display = 'inline-block';
    }
}
