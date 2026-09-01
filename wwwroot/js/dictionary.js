/**
 * Quick Dictionary & Word Meaning Pop-up Module
 */
import { escapeHtml, escapeRegExp, showToast } from './utils.js';
import { speakWord } from './speech.js';
import { updateDictSaveButtonState } from './vocab.js';

let currentDictData = null;
let currentContextSentence = '';
let dictAbortController = null;
const dictClientCache = new Map();

export function getCurrentDictData() {
    return currentDictData;
}

export function getCurrentContextSentence() {
    return currentContextSentence;
}

export function getCachedDictData(key) {
    return dictClientCache.get(key);
}

export function setCachedDictData(key, data) {
    dictClientCache.set(key, data);
}

export function setupDictionaryEvents() {
    const transcriptList = document.getElementById('transcriptList');
    const dictCloseBtn = document.getElementById('dictCloseBtn');
    const dictSpeakBtn = document.getElementById('dictSpeakBtn');
    const dictCopyBtn = document.getElementById('dictCopyBtn');
    const dictTooltip = document.getElementById('dictTooltip');

    // 1. Right Click (contextmenu) on transcript list
    if (transcriptList) {
        transcriptList.addEventListener('contextmenu', handleContextMenuLookup);
        
        // 2. Double-Click for touchpad / mobile accessibility
        transcriptList.addEventListener('dblclick', handleDoubleClickLookup);
    }

    // 3. Close button
    if (dictCloseBtn) {
        dictCloseBtn.addEventListener('click', closeDictionaryTooltip);
    }

    // 4. Dismiss on click outside
    document.addEventListener('mousedown', (e) => {
        if (dictTooltip && dictTooltip.style.display !== 'none' && !dictTooltip.contains(e.target)) {
            closeDictionaryTooltip();
        }
    });

    // 5. Dismiss on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dictTooltip && dictTooltip.style.display !== 'none') {
            closeDictionaryTooltip();
        }
    });

    // 6. Audio Pronunciation Button
    if (dictSpeakBtn) {
        dictSpeakBtn.addEventListener('click', () => {
            if (!currentDictData || !currentDictData.word) return;
            speakWord(currentDictData.word, currentDictData.sourceLanguage || 'en', currentDictData.audioUrl);
        });
    }

    // 7. Copy Translation Button
    if (dictCopyBtn) {
        dictCopyBtn.addEventListener('click', () => {
            if (!currentDictData) return;
            const textToCopy = `${currentDictData.word} → ${currentDictData.primaryTranslation}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const btnSpan = dictCopyBtn.querySelector('span');
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

function handleDoubleClickLookup(e) {
    let word = '';
    const wordEl = e.target.closest('.transcript-word');
    if (wordEl) {
        word = wordEl.getAttribute('data-word') || wordEl.textContent || '';
    } else {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            word = sel.toString().trim();
        }
    }

    if (word) {
        const cleanWord = word.trim().replace(/^['"\-.,!?;:()\[\]{}«»“”]+|['"\-.,!?;:()\[\]{}«»“”]+$/g, '');
        if (cleanWord.length > 0) {
            let contextSentence = wordEl ? (wordEl.closest('.transcript-item')?.querySelector('.item-text')?.textContent || '') : '';
            openDictionaryLookup(cleanWord, e.clientX, e.clientY, contextSentence.trim());
        }
    }
}

function handleContextMenuLookup(e) {
    const transcriptList = document.getElementById('transcriptList');
    if (!transcriptList || !transcriptList.contains(e.target)) return;

    let targetWord = '';

    // 1. Text selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        if (transcriptList.contains(range.commonAncestorContainer)) {
            const selectedText = sel.toString().trim();
            if (selectedText.length > 0 && selectedText.length < 80) {
                targetWord = selectedText;
            }
        }
    }

    // 2. Direct click on word token
    if (!targetWord) {
        const wordEl = e.target.closest('.transcript-word');
        if (wordEl) {
            targetWord = wordEl.getAttribute('data-word') || wordEl.textContent || '';
        }
    }

    // 3. Fallback: inspect caret coordinates
    if (!targetWord) {
        const transcriptItem = e.target.closest('.transcript-item');
        if (transcriptItem) {
            targetWord = getWordAtPoint(e.clientX, e.clientY);
        }
    }

    // 4. Final fallback: extract nearest single word
    if (!targetWord && e.target) {
        const text = e.target.textContent || '';
        const words = text.match(/[\p{L}\p{N}_'-]+/gu);
        if (words && words.length === 1) {
            targetWord = words[0];
        }
    }

    if (targetWord && targetWord.trim().length > 0) {
        const cleanWord = targetWord.trim().replace(/^['"\-.,!?;:()\[\]{}«»“”]+|['"\-.,!?;:()\[\]{}«»“”]+$/g, '');
        if (cleanWord.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            let contextSentence = e.target.closest('.transcript-item')?.querySelector('.item-text')?.textContent || '';
            openDictionaryLookup(cleanWord, e.clientX, e.clientY, contextSentence.trim());
        }
    }
}

function getWordAtPoint(x, y) {
    let textNode = null;
    let offset = 0;

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

    if (start >= text.length || !/[\p{L}\p{N}_'-]/u.test(text[start])) {
        if (start > 0 && /[\p{L}\p{N}_'-]/u.test(text[start - 1])) {
            start--;
            end = start;
        }
    }

    while (start > 0 && /[\p{L}\p{N}_'-]/u.test(text[start - 1])) {
        start--;
    }
    while (end < text.length && /[\p{L}\p{N}_'-]/u.test(text[end])) {
        end++;
    }

    return text.slice(start, end).trim();
}

export async function openDictionaryLookup(word, x, y, contextSentence = '') {
    currentContextSentence = contextSentence;
    const dictTooltip = document.getElementById('dictTooltip');
    const dictWord = document.getElementById('dictWord');
    const dictPhonetic = document.getElementById('dictPhonetic');
    const dictLangTag = document.getElementById('dictLangTag');
    const dictBody = document.getElementById('dictBody');

    if (!dictTooltip) return;

    const cleanWordKey = (word || '').trim().toLowerCase();

    if (dictAbortController) {
        try { dictAbortController.abort(); } catch (e) {}
    }
    dictAbortController = new AbortController();

    // In-memory frontend cache
    if (cleanWordKey && dictClientCache.has(cleanWordKey)) {
        const cachedData = dictClientCache.get(cleanWordKey);
        currentDictData = cachedData;
        renderDictionaryData(cachedData);
        positionDictionaryTooltip(x, y);
        updateDictSaveButtonState(word);
        return;
    }

    if (dictWord) dictWord.textContent = word;
    if (dictPhonetic) {
        dictPhonetic.style.display = 'none';
        dictPhonetic.textContent = '';
    }
    if (dictLangTag) dictLangTag.textContent = 'EN → TR';
    if (dictBody) {
        dictBody.innerHTML = `
            <div class="dict-skeleton">
                <div class="dict-skeleton-line title"></div>
                <div class="dict-skeleton-line badge"></div>
                <div class="dict-skeleton-line"></div>
                <div class="dict-skeleton-line short"></div>
            </div>
        `;
    }

    positionDictionaryTooltip(x, y);

    try {
        const res = await fetch('/api/dictionary/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Word: word,
                TargetLanguage: 'tr'
            }),
            signal: dictAbortController.signal
        });

        const data = await res.json();
        if (!res.ok || (data.success === false && data.message && !data.primaryTranslation)) {
            throw new Error(data.message || 'Sözlükte anlam bulunamadı.');
        }

        currentDictData = data;
        if (cleanWordKey && data.success && data.primaryTranslation) {
            dictClientCache.set(cleanWordKey, data);
        }

        renderDictionaryData(data);
        positionDictionaryTooltip(x, y);
        updateDictSaveButtonState(word);
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Dictionary Lookup Error:', err);
        if (dictBody) {
            dictBody.innerHTML = `
                <div style="padding: 1rem 0; color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    <span>❌</span>
                    <span>Anlam bulunamadı: ${escapeHtml(err.message || 'Hizmete ulaşılamadı.')}</span>
                </div>
            `;
        }
        positionDictionaryTooltip(x, y);
    }
}

export function renderDictionaryData(data, prefix = 'dict') {
    const dictWord = document.getElementById(`${prefix}Word`);
    const dictPhonetic = document.getElementById(`${prefix}Phonetic`);
    const dictLangTag = document.getElementById(`${prefix}LangTag`);
    const dictBody = document.getElementById(`${prefix}Body`);

    if (dictWord) dictWord.textContent = data.word || '';

    if (dictPhonetic) {
        if (data.phonetic && data.phonetic.trim()) {
            dictPhonetic.textContent = data.phonetic.trim();
            dictPhonetic.style.display = 'inline-block';
        } else {
            dictPhonetic.style.display = 'none';
        }
    }

    const srcLang = (data.sourceLanguage || 'en').toUpperCase();
    const tgtLang = (data.targetLanguage || 'tr').toUpperCase();
    if (dictLangTag) dictLangTag.textContent = `${srcLang} → ${tgtLang}`;

    let html = '';

    if (data.primaryTranslation) {
        html += `
            <div class="dict-primary-box">
                <div class="dict-primary-label">Türkçe Karşılığı</div>
                <div class="dict-primary-text">${escapeHtml(data.primaryTranslation)}</div>
                ${data.message ? `<div class="dict-root-hint">💡 ${escapeHtml(data.message)}</div>` : ''}
            </div>
        `;
    }

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

            if (entry.meanings && entry.meanings.length > 0) {
                html += `<div class="dict-meanings-wrap">`;
                entry.meanings.forEach(m => {
                    html += `<span class="dict-meaning-chip">${escapeHtml(m)}</span>`;
                });
                html += `</div>`;
            }

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

    if (dictBody) dictBody.innerHTML = html;
}

function highlightWordInExample(sentence, word) {
    if (!word || !sentence) return escapeHtml(sentence);
    const escapedSent = escapeHtml(sentence);
    const reg = new RegExp(`\\b(${escapeRegExp(word)})\\b`, 'gi');
    return escapedSent.replace(reg, '<mark>$1</mark>');
}

/**
 * Intelligent Viewport Clamping
 * Prevents dictionary tooltip from cutting off on window boundaries.
 */
export function positionDictionaryTooltip(x, y) {
    const tooltip = document.getElementById('dictTooltip');
    if (!tooltip) return;

    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'flex';

    const rect = tooltip.getBoundingClientRect();
    const tooltipWidth = rect.width || 460;
    const tooltipHeight = rect.height || 340;
    const padding = 16;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let posX = x + 15;
    let posY = y + 15;

    // Check right edge overflow
    if (posX + tooltipWidth > viewportWidth - padding) {
        posX = x - tooltipWidth - 15;
        if (posX < padding) {
            posX = viewportWidth - tooltipWidth - padding;
        }
    }

    // Check left boundary
    if (posX < padding) {
        posX = padding;
    }

    // Check bottom edge overflow: flip up if needed
    if (posY + tooltipHeight > viewportHeight - padding) {
        posY = y - tooltipHeight - 15;
        if (posY < padding) {
            posY = Math.max(padding, viewportHeight - tooltipHeight - padding);
        }
    }

    tooltip.style.left = `${Math.round(posX)}px`;
    tooltip.style.top = `${Math.round(posY)}px`;
    tooltip.style.visibility = 'visible';
}

export function closeDictionaryTooltip() {
    const tooltip = document.getElementById('dictTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    if (dictAbortController) {
        try { dictAbortController.abort(); } catch (e) {}
    }
}
