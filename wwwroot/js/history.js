import { state } from './state.js';
import { escapeHtml, formatTimeSpan } from './utils.js';

/* ==========================================================
   History List (İzleme Geçmişim) Logic
   ========================================================== */

export function setupHistoryEvents() {
    const historyBtn = document.getElementById('historyBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyModal = document.getElementById('historyModal');
    const historyListContainer = document.getElementById('historyListContainer');

    if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);

    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) closeHistoryModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && historyModal.style.display !== 'none') {
                closeHistoryModal();
            }
        });
    }

    if (historyListContainer) {
        historyListContainer.addEventListener('click', handleHistoryContainerClick);
    }
}

export function getHistoryList() {
    try {
        const data = localStorage.getItem('transkript_watch_history');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveHistoryList(list) {
    localStorage.setItem('transkript_watch_history', JSON.stringify(list));
}

// Called periodically by player/transcript sync loop
let lastSaveTime = 0;
export function trackVideoProgress(currentTime) {
    if (!state.currentVideoId || !state.metadata) return;

    // Throttle save to once every 5 seconds to avoid spamming localStorage
    const now = Date.now();
    if (now - lastSaveTime < 5000 && currentTime !== 0) return;
    lastSaveTime = now;

    let list = getHistoryList();
    const existingIndex = list.findIndex(item => item.videoId === state.currentVideoId);

    const historyItem = {
        videoId: state.currentVideoId,
        url: state.currentVideoUrl,
        title: state.metadata.title,
        author: state.metadata.author,
        timestamp: currentTime,
        date: new Date().toISOString()
    };

    if (existingIndex !== -1) {
        list[existingIndex] = historyItem;
    } else {
        list.push(historyItem);
    }

    // Keep max 50 items
    if (list.length > 50) {
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        list = list.slice(0, 50);
    }

    saveHistoryList(list);
}

export function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'flex';
        renderHistoryList();
    }
}

export function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

export function renderHistoryList() {
    const listContainer = document.getElementById('historyListContainer');
    const emptyState = document.getElementById('historyEmptyState');

    if (!listContainer || !emptyState) return;

    let list = getHistoryList();

    if (list.length === 0) {
        listContainer.innerHTML = '';
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    listContainer.style.display = 'flex';

    // Sort latest first
    const sortedList = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

    listContainer.innerHTML = sortedList.map(item => {
        const dateStr = new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `
            <li class="history-item" data-url="${escapeHtml(item.url)}" data-timestamp="${item.timestamp || 0}" style="cursor: pointer;">
                <div class="history-content">
                    <div class="history-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                    <div class="history-meta">
                        <span>${escapeHtml(item.author)}</span> • 
                        <span class="history-progress">Kaldığın yer: ${formatTimeSpan(item.timestamp || 0)}</span> • 
                        <span>${dateStr}</span>
                    </div>
                </div>
                <button class="btn-delete-history" data-id="${escapeHtml(item.videoId)}" title="Geçmişten Sil">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </li>
        `;
    }).join('');
}

function handleHistoryContainerClick(e) {
    // Delete action
    const deleteBtn = e.target.closest('.btn-delete-history');
    if (deleteBtn) {
        e.stopPropagation();
        const videoIdToDelete = deleteBtn.getAttribute('data-id');
        if (videoIdToDelete) {
            let currentList = getHistoryList();
            currentList = currentList.filter(item => item.videoId !== videoIdToDelete);
            saveHistoryList(currentList);
            renderHistoryList();
        }
        return;
    }

    // Item click action (load video)
    const item = e.target.closest('.history-item');
    if (item) {
        const url = item.getAttribute('data-url');
        const timestamp = parseFloat(item.getAttribute('data-timestamp'));

        if (url) {
            closeHistoryModal();

            // Set seek time cleanly in central state
            state.pendingSeekTime = timestamp;

            const videoUrlInput = document.getElementById('videoUrlInput');
            const fetchBtn = document.getElementById('fetchBtn');

            if (videoUrlInput && fetchBtn) {
                videoUrlInput.value = url;
                fetchBtn.click();
            }
        }
    }
}
