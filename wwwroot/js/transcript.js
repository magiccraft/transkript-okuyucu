/**
 * Transcript Rendering, Live Synchronization & Search Navigation Module
 * with High-Performance Fixed-Spacer Virtual Scrolling and Exact Centering
 */
import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { seekVideoTo } from './player.js';

let scrollPausedBadgeTimeout = null;

// Virtual Scroll Engine State
export const vsState = {
    itemHeight: 56,     // Approximate row height (px) including padding and gap
    buffer: 15,         // Render extra rows above and below viewport
    itemsToRender: [],  // Array of { item, index }
    lastStartIndex: -1,
    isVirtual: true,
    pendingExactCenterIndex: -1 // Used for exact centering after virtual render
};

export function initTranscriptEvents() {
    const transcriptList = document.getElementById('transcriptList');
    if (!transcriptList) return;

    // Click delegation for translate, repeat and timestamp buttons
    transcriptList.addEventListener('click', handleTranscriptListClick);

    // Scroll Intent Detection: Pause auto-scroll when user manually scrolls
    const handleUserScroll = () => {
        const autoScrollToggle = document.getElementById('autoScrollToggle');
        if (!autoScrollToggle || !autoScrollToggle.checked) {
            return;
        }

        state.isUserScrolling = true;
        showScrollPausedIndicator();

        if (state.userScrollResumeTimeout) {
            clearTimeout(state.userScrollResumeTimeout);
        }

        state.userScrollResumeTimeout = setTimeout(() => {
            if (autoScrollToggle && autoScrollToggle.checked) {
                resumeAutoScroll();
            } else {
                state.isUserScrolling = false;
                hideScrollPausedIndicator();
            }
        }, 12000);
    };

    transcriptList.addEventListener('wheel', handleUserScroll, { passive: true });
    transcriptList.addEventListener('touchmove', handleUserScroll, { passive: true });

    // Virtual Scroll Listener
    transcriptList.addEventListener('scroll', () => {
        requestAnimationFrame(updateVirtualScroll);
    }, { passive: true });
}

export function resumeAutoScroll() {
    state.isUserScrolling = false;
    if (state.userScrollResumeTimeout) {
        clearTimeout(state.userScrollResumeTimeout);
        state.userScrollResumeTimeout = null;
    }
    hideScrollPausedIndicator();
    if (state.activeItemIndex >= 0) {
        scrollToActiveItem(state.activeItemIndex);
    }
}

export function showScrollPausedIndicator() {
    const transcriptCard = document.querySelector('.transcript-card');
    if (!transcriptCard) return;

    let badge = document.getElementById('scrollPausedBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'scrollPausedBadge';
        badge.className = 'scroll-paused-badge';
        badge.title = 'Oto-kaydırmayı sürdürmek için tıklayın';
        badge.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>
            </svg>
            <span>Oto-kaydırma bekletildi • <u>Sürdür</u></span>
        `;
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            resumeAutoScroll();
        });
        transcriptCard.appendChild(badge);
    }
    badge.style.display = 'flex';

    if (scrollPausedBadgeTimeout) clearTimeout(scrollPausedBadgeTimeout);
    scrollPausedBadgeTimeout = setTimeout(() => {
        if (badge) badge.style.display = 'none';
    }, 6000);
}

export function hideScrollPausedIndicator() {
    if (scrollPausedBadgeTimeout) {
        clearTimeout(scrollPausedBadgeTimeout);
        scrollPausedBadgeTimeout = null;
    }
    const badge = document.getElementById('scrollPausedBadge');
    if (badge) badge.style.display = 'none';
}

export function renderTranscriptItems() {
    const transcriptList = document.getElementById('transcriptList');
    const itemCountBadge = document.getElementById('itemCountBadge');
    if (!transcriptList) return;

    if (!state.transcript || !state.transcript.items || state.transcript.items.length === 0) {
        transcriptList.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                Transkript satırı bulunamadı.
            </div>
        `;
        if (itemCountBadge) itemCountBadge.textContent = '0 satır';
        vsState.itemsToRender = [];
        return;
    }

    const items = state.transcript.items;
    const query = state.searchQuery ? state.searchQuery.trim() : '';
    state.searchMatchIndices = [];
    state.currentSearchMatchIndex = -1;

    // Filter matching items
    vsState.itemsToRender = items.map((item, index) => {
        const isMatch = !query || item.text.toLowerCase().includes(query.toLowerCase());
        if (isMatch && query) {
            state.searchMatchIndices.push(index);
        }
        return { item, index, isMatch };
    }).filter(x => x.isMatch);

    const totalHeight = vsState.itemsToRender.length * vsState.itemHeight;

    transcriptList.innerHTML = `
        <div id="vs-container" style="position: relative; width: 100%; height: ${totalHeight}px;">
            <div id="vs-content" class="vs-content" style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY(0px);"></div>
        </div>
    `;

    vsState.lastStartIndex = -1;
    updateVirtualScroll();
    updateSearchMatchDisplay();

    // If active item exists, highlight it
    if (state.activeItemIndex >= 0) {
        updateActiveItemHighlight(state.activeItemIndex);
    }
}

export function updateVirtualScroll() {
    if (vsState.itemsToRender.length === 0) return;

    const transcriptList = document.getElementById('transcriptList');
    const vsContent = document.getElementById('vs-content');
    if (!transcriptList || !vsContent) return;

    const scrollTop = transcriptList.scrollTop;
    const containerHeight = transcriptList.clientHeight || 500;

    let startIndex = Math.max(0, Math.floor(scrollTop / vsState.itemHeight) - vsState.buffer);
    let endIndex = Math.min(vsState.itemsToRender.length - 1, Math.floor((scrollTop + containerHeight) / vsState.itemHeight) + vsState.buffer);

    if (startIndex !== vsState.lastStartIndex) {
        vsState.lastStartIndex = startIndex;

        const offsetY = startIndex * vsState.itemHeight;
        vsContent.style.transform = `translateY(${offsetY}px)`;

        const query = state.searchQuery ? state.searchQuery.trim() : '';
        let html = '';

        for (let i = startIndex; i <= endIndex; i++) {
            const renderData = vsState.itemsToRender[i];
            if (!renderData) continue;

            const item = renderData.item;
            const index = renderData.index;
            const isActive = index === state.activeItemIndex;
            
            if (item._cachedQuery !== query || !item._cachedHtml) {
                item._cachedHtml = formatTranscriptWords(item.text, query);
                item._cachedQuery = query;
            }
            const formattedContent = item._cachedHtml;

            html += `
            <div class="transcript-item ${isActive ? 'active' : ''}" 
                 data-index="${index}" 
                 data-offset="${item.offsetSeconds}">
                <button class="item-timestamp-btn" aria-label="${item.timestampFormatted} süresine git" title="Videoyu bu saniyeye sar" tabindex="0">
                    <span class="item-timestamp">${item.timestampFormatted}</span>
                </button>
                <div class="item-content-wrapper" style="flex: 1; display: flex; flex-direction: column;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
                        <span class="item-text" style="flex: 1;">${formattedContent}</span>
                        <div style="display: flex; gap: 0.25rem;">
                            <button class="btn-translate" title="Türkçeye Çevir" data-text="${escapeHtml(item.text)}">🌐</button>
                            <button class="btn-repeat ${index === state.repeatIndex ? 'active' : ''}" title="Sürekli Tekrarla" data-index="${index}">🔁</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        vsContent.innerHTML = html;
    } else {
        // Just sync active highlights on rendered DOM nodes
        const renderedActives = vsContent.querySelectorAll('.transcript-item.active');
        renderedActives.forEach(el => {
            const idx = parseInt(el.getAttribute('data-index'), 10);
            if (idx !== state.activeItemIndex) {
                el.classList.remove('active');
            }
        });
        const currentActiveEl = vsContent.querySelector(`.transcript-item[data-index="${state.activeItemIndex}"]`);
        if (currentActiveEl && !currentActiveEl.classList.contains('active')) {
            currentActiveEl.classList.add('active');
        }
    }

    // Process pending exact centering if the target item is now in the DOM
    if (vsState.pendingExactCenterIndex !== -1) {
        const targetEl = vsContent.querySelector(`.transcript-item[data-index="${vsState.pendingExactCenterIndex}"]`);
        if (targetEl) {
            const index = vsState.pendingExactCenterIndex;
            vsState.pendingExactCenterIndex = -1; // clear flag to prevent infinite loops

            const localOffsetTop = targetEl.offsetTop;
            const itemHeight = targetEl.offsetHeight;
            const offsetY = vsState.lastStartIndex * vsState.itemHeight;
            const absoluteTop = offsetY + localOffsetTop;
            const exactScroll = absoluteTop - (transcriptList.clientHeight / 2) + (itemHeight / 2);

            const currentTop = transcriptList.scrollTop;
            const targetTop = Math.max(0, exactScroll);
            const distance = Math.abs(currentTop - targetTop);
            transcriptList.scrollTo({
                top: targetTop,
                behavior: distance > 2500 ? 'auto' : 'smooth'
            });
            
            if (vsState.pendingSearchFocus) {
                targetEl.classList.add('search-focus');
                setTimeout(() => targetEl.classList.remove('search-focus'), 1200);
                vsState.pendingSearchFocus = false;
            }
        }
    }
}

export function formatTranscriptWords(text, query) {
    if (!text) return '';

    const highlightRanges = [];
    if (query) {
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let startIndex = 0;
        let index;
        while ((index = lowerText.indexOf(lowerQuery, startIndex)) > -1) {
            highlightRanges.push({ start: index, end: index + query.length });
            startIndex = index + query.length;
        }
    }

    // Split text into word tokens and delimiters (whitespace, punctuation)
    const tokens = text.split(/([^\p{L}\p{N}_'-]+)/u);
    let currentPos = 0;

    return tokens.map(token => {
        if (!token) return '';

        const tokenStart = currentPos;
        currentPos += token.length;

        let innerHtml = '';
        let inMark = false;

        for (let i = 0; i < token.length; i++) {
            const charPos = tokenStart + i;
            const isHighlighted = highlightRanges.some(r => charPos >= r.start && charPos < r.end);

            if (isHighlighted && !inMark) {
                innerHtml += '<mark class="search-hit">';
                inMark = true;
            } else if (!isHighlighted && inMark) {
                innerHtml += '</mark>';
                inMark = false;
            }

            innerHtml += escapeHtml(token[i]);
        }
        if (inMark) {
            innerHtml += '</mark>';
        }

        if (!/[\p{L}\p{N}]/u.test(token)) {
            return innerHtml;
        }

        const cleanWord = token.replace(/^['"\-.,!?;:()\[\]{}«»“”]+|['"\-.,!?;:()\[\]{}«»“”]+$/g, '');
        return `<span class="transcript-word" data-word="${escapeHtml(cleanWord)}">${innerHtml}</span>`;
    }).join('');
}

export function updateSearchMatchDisplay() {
    const itemCountBadge = document.getElementById('itemCountBadge');
    if (!itemCountBadge) return;

    const total = state.transcript ? state.transcript.items.length : 0;
    const matchCount = state.searchMatchIndices.length;

    if (state.searchQuery) {
        const currentPos = state.currentSearchMatchIndex >= 0 ? state.currentSearchMatchIndex + 1 : (matchCount > 0 ? 1 : 0);
        itemCountBadge.textContent = `${currentPos}/${matchCount} eşleşme (${total} satır)`;
    } else {
        itemCountBadge.textContent = `${total} satır`;
    }
}

export function navigateSearchMatch(direction = 1) {
    if (state.searchMatchIndices.length === 0) return;

    if (state.currentSearchMatchIndex === -1) {
        state.currentSearchMatchIndex = 0;
    } else {
        state.currentSearchMatchIndex = (state.currentSearchMatchIndex + direction + state.searchMatchIndices.length) % state.searchMatchIndices.length;
    }

    const targetItemIndex = state.searchMatchIndices[state.currentSearchMatchIndex];
    
    vsState.pendingSearchFocus = true;
    scrollToActiveItem(targetItemIndex);
    updateSearchMatchDisplay();
}

export function syncTranscriptWithPlayback() {
    if (!state.player || typeof state.player.getCurrentTime !== 'function' || !state.transcript) {
        return;
    }

    const currentTime = state.player.getCurrentTime();
    const items = state.transcript.items;
    if (!items || items.length === 0) return;

    // Find current active item with Binary Search
    let foundIndex = -1;
    let low = 0;
    let high = items.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const item = items[mid];
        const nextItem = items[mid + 1];
        const start = item.offsetSeconds;
        const end = nextItem ? nextItem.offsetSeconds : (start + item.durationSeconds + 1);

        if (currentTime >= start && currentTime < end) {
            foundIndex = mid;
            break;
        } else if (currentTime < start) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    if (foundIndex === -1 && currentTime >= items[items.length - 1].offsetSeconds) {
        foundIndex = items.length - 1;
    }

    if (foundIndex !== -1 && foundIndex !== state.activeItemIndex) {
        state.activeItemIndex = foundIndex;
        updateActiveItemHighlight(foundIndex);
    }

    // Single Line Repeat Loop Logic
    if (state.repeatIndex !== -1 && items[state.repeatIndex]) {
        const repeatItem = items[state.repeatIndex];
        const nextItem = items[state.repeatIndex + 1];
        const start = repeatItem.offsetSeconds;
        const end = nextItem ? nextItem.offsetSeconds : (start + repeatItem.durationSeconds);

        if (currentTime >= end || currentTime < start - 1.0) {
            seekVideoTo(start);
        }
    }
}

export function scrollToActiveItem(index) {
    const transcriptList = document.getElementById('transcriptList');
    const vsContent = document.getElementById('vs-content');
    if (!transcriptList || !vsContent) return;

    const renderPos = vsState.itemsToRender.findIndex(r => r.index === index);
    if (renderPos !== -1) {
        const activeEl = vsContent.querySelector(`.transcript-item[data-index="${index}"]`);
        
        if (activeEl) {
            // It's already in the DOM, center exactly using its real height and position
            const localOffsetTop = activeEl.offsetTop;
            const itemHeight = activeEl.offsetHeight;
            const offsetY = vsState.lastStartIndex * vsState.itemHeight;
            const absoluteTop = offsetY + localOffsetTop;
            const exactScroll = absoluteTop - (transcriptList.clientHeight / 2) + (itemHeight / 2);
            
            const currentTop = transcriptList.scrollTop;
            const targetTop = Math.max(0, exactScroll);
            const distance = Math.abs(currentTop - targetTop);
            transcriptList.scrollTo({ top: targetTop, behavior: distance > 2500 ? 'auto' : 'smooth' });
            
            if (vsState.pendingSearchFocus) {
                activeEl.classList.add('search-focus');
                setTimeout(() => activeEl.classList.remove('search-focus'), 1200);
                vsState.pendingSearchFocus = false;
            }
        } else {
            // It's not in the DOM yet. Scroll to estimate and queue exact centering.
            vsState.pendingExactCenterIndex = index;
            const estimatedScroll = Math.max(0, (renderPos * vsState.itemHeight) - (transcriptList.clientHeight / 2) + (vsState.itemHeight / 2));
            const currentTop = transcriptList.scrollTop;
            const distance = Math.abs(currentTop - estimatedScroll);
            transcriptList.scrollTo({ top: estimatedScroll, behavior: distance > 2500 ? 'auto' : 'smooth' });
        }
    }
}

export function updateActiveItemHighlight(activeIndex) {
    const transcriptList = document.getElementById('transcriptList');
    const autoScrollToggle = document.getElementById('autoScrollToggle');
    if (!transcriptList) return;

    // We only need to update the DOM if the item is rendered
    const vsContent = document.getElementById('vs-content');
    if (vsContent) {
        const existingActives = vsContent.querySelectorAll('.transcript-item.active');
        existingActives.forEach(el => el.classList.remove('active'));

        const newActive = vsContent.querySelector(`.transcript-item[data-index="${activeIndex}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }
    }

    // Only auto-scroll if enabled AND user is not manually scrolling
    if (autoScrollToggle && autoScrollToggle.checked && !state.isUserScrolling) {
        scrollToActiveItem(activeIndex);
    }
}

async function handleTranscriptListClick(e) {
    // 1. Repeat button click
    const btnRepeat = e.target.closest('.btn-repeat');
    if (btnRepeat) {
        e.stopPropagation();
        const index = parseInt(btnRepeat.getAttribute('data-index'), 10);
        const vsContent = document.getElementById('vs-content');

        if (state.repeatIndex === index) {
            state.repeatIndex = -1;
            btnRepeat.classList.remove('active');
        } else {
            const prev = vsContent ? vsContent.querySelector('.btn-repeat.active') : null;
            if (prev) prev.classList.remove('active');

            state.repeatIndex = index;
            btnRepeat.classList.add('active');

            if (state.transcript && state.transcript.items[index]) {
                seekVideoTo(state.transcript.items[index].offsetSeconds);
            }
        }
        return;
    }

    // 2. Line Translate button click
    const btnTranslate = e.target.closest('.btn-translate');
    if (btnTranslate) {
        e.stopPropagation();
        const itemWrapper = btnTranslate.closest('.item-content-wrapper');
        let resultBox = itemWrapper.querySelector('.translation-result');

        if (resultBox) {
            resultBox.style.display = resultBox.style.display === 'none' ? 'block' : 'none';
            return;
        }

        const textToTranslate = btnTranslate.getAttribute('data-text');
        if (!textToTranslate) return;

        resultBox = document.createElement('div');
        resultBox.className = 'translation-result';
        resultBox.innerHTML = '<span style="opacity: 0.7;">Çevriliyor...</span>';
        itemWrapper.appendChild(resultBox);
        btnTranslate.style.opacity = '1';
        btnTranslate.disabled = true;

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
            btnTranslate.disabled = false;
            btnTranslate.style.opacity = '';
        }
        return;
    }

    // 3. Transcript Item seek click (click timestamp or anywhere on the item row)
    const itemEl = e.target.closest('.transcript-item');
    if (itemEl && !e.target.closest('.translation-result') && !e.target.closest('.btn-translate') && !e.target.closest('.btn-repeat')) {
        // If user is actively selecting text (e.g. for copying or dictionary), do not seek
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return;
        }

        const offset = parseFloat(itemEl.getAttribute('data-offset'));
        const idx = parseInt(itemEl.getAttribute('data-index'), 10);
        if (!isNaN(offset)) {
            // Resume auto-scroll when user clicks a transcript line
            state.isUserScrolling = false;
            hideScrollPausedIndicator();
            seekVideoTo(offset);
            if (!isNaN(idx)) {
                state.activeItemIndex = idx;
                updateActiveItemHighlight(idx);
            }
        }
    }
}
