/**
 * Vocabulary Notebook (Kelime Defterim) & Anki Export Module
 */
import { escapeHtml, showToast } from './utils.js';
import { speakWord } from './speech.js';
import { renderDictionaryData, getCachedDictData, setCachedDictData, getCurrentDictData, getCurrentContextSentence } from './dictionary.js';

export function setupVocabListEvents() {
    const vocabListBtn = document.getElementById('vocabListBtn');
    const closeVocabBtn = document.getElementById('closeVocabBtn');
    const vocabModal = document.getElementById('vocabModal');
    const exportVocabBtn = document.getElementById('exportVocabBtn');
    const dictSaveBtn = document.getElementById('dictSaveBtn');
    const closeVocabDrawerBtn = document.getElementById('closeVocabDrawerBtn');
    const drawerDictSpeakBtn = document.getElementById('drawerDictSpeakBtn');
    const vocabListContainer = document.getElementById('vocabListContainer');

    if (vocabListBtn) vocabListBtn.addEventListener('click', openVocabModal);
    if (closeVocabBtn) closeVocabBtn.addEventListener('click', closeVocabModal);

    if (vocabModal) {
        vocabModal.addEventListener('click', (e) => {
            if (e.target === vocabModal) closeVocabModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && vocabModal.style.display !== 'none') {
                closeVocabModal();
            }
        });
    }

    if (exportVocabBtn) exportVocabBtn.addEventListener('click', exportVocabCSV);
    if (dictSaveBtn) dictSaveBtn.addEventListener('click', toggleSaveCurrentWord);

    if (closeVocabDrawerBtn) {
        closeVocabDrawerBtn.addEventListener('click', closeVocabDrawer);
    }

    if (drawerDictSpeakBtn) {
        drawerDictSpeakBtn.addEventListener('click', () => {
            const word = document.getElementById('drawerDictWord')?.textContent;
            if (word) {
                speakWord(word, 'en');
            }
        });
    }

    // Delegated click listener on list container for item selection and delete actions
    if (vocabListContainer) {
        vocabListContainer.addEventListener('click', handleVocabContainerClick);
    }
}

export function getVocabList() {
    try {
        const data = localStorage.getItem('transkript_vocab_list');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveVocabList(list) {
    localStorage.setItem('transkript_vocab_list', JSON.stringify(list));
}

export function isWordSaved(word) {
    if (!word) return false;
    const list = getVocabList();
    return list.some(item => item.word.toLowerCase() === word.toLowerCase());
}

export function updateDictSaveButtonState(word) {
    const dictSaveBtn = document.getElementById('dictSaveBtn');
    if (!dictSaveBtn || !word) return;

    const icon = dictSaveBtn.querySelector('.icon-star');
    const span = dictSaveBtn.querySelector('span');

    if (isWordSaved(word)) {
        if (icon) icon.classList.add('saved');
        dictSaveBtn.classList.add('saved');
        if (span) span.textContent = 'Kaydedildi';
    } else {
        if (icon) icon.classList.remove('saved');
        dictSaveBtn.classList.remove('saved');
        if (span) span.textContent = 'Kaydet';
    }
}

function toggleSaveCurrentWord() {
    const currentDict = getCurrentDictData();
    if (!currentDict || !currentDict.word) return;
    const word = currentDict.word;
    let list = getVocabList();

    const existingIndex = list.findIndex(item => item.word.toLowerCase() === word.toLowerCase());

    if (existingIndex !== -1) {
        list.splice(existingIndex, 1);
        saveVocabList(list);
        updateDictSaveButtonState(word);
        showToast(`'${word}' defterden silindi.`);
    } else {
        const primaryTrans = currentDict.primaryTranslation || '';
        list.push({
            word: word,
            translation: primaryTrans,
            context: getCurrentContextSentence(),
            date: new Date().toISOString()
        });
        saveVocabList(list);
        updateDictSaveButtonState(word);
        showToast(`'${word}' deftere eklendi!`);
    }
}

export function openVocabModal() {
    const modal = document.getElementById('vocabModal');
    if (modal) {
        modal.style.display = 'flex';
        closeVocabDrawer();
        renderVocabList();
    }
}

export function closeVocabModal() {
    const modal = document.getElementById('vocabModal');
    if (modal) {
        modal.style.display = 'none';
        closeVocabDrawer();
    }
}

function openVocabDrawer() {
    const drawer = document.getElementById('vocabDrawer');
    const modalContent = document.getElementById('vocabModalContent');
    if (drawer && modalContent) {
        drawer.style.display = 'flex';
        modalContent.style.maxWidth = '950px';
    }
}

function closeVocabDrawer() {
    const drawer = document.getElementById('vocabDrawer');
    const modalContent = document.getElementById('vocabModalContent');
    if (drawer && modalContent) {
        drawer.style.display = 'none';
        modalContent.style.maxWidth = '600px';
    }
}

async function lookupWordForDrawer(word) {
    const cleanWordKey = (word || '').trim().toLowerCase();
    if (!cleanWordKey) return;

    openVocabDrawer();

    const dictWord = document.getElementById('drawerDictWord');
    const dictPhonetic = document.getElementById('drawerDictPhonetic');
    const dictLangTag = document.getElementById('drawerDictLangTag');
    const dictBody = document.getElementById('drawerDictBody');

    if (dictWord) dictWord.textContent = word;
    if (dictPhonetic) dictPhonetic.style.display = 'none';
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

    const cached = getCachedDictData(cleanWordKey);
    if (cached) {
        renderDictionaryData(cached, 'drawerDict');
        return;
    }

    try {
        const res = await fetch('/api/dictionary/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Word: cleanWordKey, TargetLanguage: 'tr' })
        });
        const data = await res.json();
        if (res.ok && data.success !== false) {
            setCachedDictData(cleanWordKey, data);
            renderDictionaryData(data, 'drawerDict');
        } else {
            throw new Error(data.message || 'Sözlükte anlam bulunamadı.');
        }
    } catch (err) {
        if (dictBody) {
            dictBody.innerHTML = `
                <div style="padding: 1rem 0; color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                    <span>❌</span>
                    <span>Anlam bulunamadı: ${escapeHtml(err.message || 'Hizmete ulaşılamadı.')}</span>
                </div>
            `;
        }
    }
}

export function renderVocabList() {
    const listContainer = document.getElementById('vocabListContainer');
    const emptyState = document.getElementById('vocabEmptyState');
    const vocabCount = document.getElementById('vocabCount');

    if (!listContainer || !emptyState || !vocabCount) return;

    const list = getVocabList();
    vocabCount.textContent = list.length;

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
        const dateStr = new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
        return `
            <li class="vocab-item" data-word="${escapeHtml(item.word)}" style="cursor: pointer; transition: background-color 0.2s;">
                <div class="vocab-content">
                    <div class="vocab-header">
                        <span class="vocab-word">${escapeHtml(item.word)}</span>
                        <span class="vocab-translation">${escapeHtml(item.translation)}</span>
                    </div>
                    ${item.context ? `<div class="vocab-context">"${escapeHtml(item.context)}"</div>` : ''}
                    <span class="vocab-date">Eklendi: ${dateStr}</span>
                </div>
                <button class="btn-delete-vocab" data-word="${escapeHtml(item.word)}" title="Sil">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </li>
        `;
    }).join('');
}

function handleVocabContainerClick(e) {
    // Delete action
    const deleteBtn = e.target.closest('.btn-delete-vocab');
    if (deleteBtn) {
        e.stopPropagation();
        const wordToDelete = deleteBtn.getAttribute('data-word');
        if (wordToDelete) {
            let currentList = getVocabList();
            currentList = currentList.filter(item => item.word.toLowerCase() !== wordToDelete.toLowerCase());
            saveVocabList(currentList);
            renderVocabList();

            const drawerWord = document.getElementById('drawerDictWord')?.textContent;
            if (drawerWord && drawerWord.toLowerCase() === wordToDelete.toLowerCase()) {
                closeVocabDrawer();
            }

            const currentDict = getCurrentDictData();
            if (currentDict && currentDict.word && currentDict.word.toLowerCase() === wordToDelete.toLowerCase()) {
                updateDictSaveButtonState(currentDict.word);
            }
        }
        return;
    }

    // Item click action (open drawer)
    const item = e.target.closest('.vocab-item');
    if (item) {
        const word = item.getAttribute('data-word');
        if (word) {
            lookupWordForDrawer(word);
        }
    }
}

function exportVocabCSV() {
    const list = getVocabList();
    if (list.length === 0) {
        showToast('Dışa aktarılacak kelime bulunamadı.');
        return;
    }

    // Format for Anki (Word \t Translation \t Context)
    let csvContent = "Word\tTranslation\tContext\n";
    list.forEach(item => {
        const cleanWord = (item.word || '').replace(/\t/g, ' ');
        const cleanTrans = (item.translation || '').replace(/\t/g, ' ');
        const cleanContext = (item.context || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
        csvContent += `${cleanWord}\t${cleanTrans}\t${cleanContext}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `Kelime_Defterim_${dateStr}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Kelime defteri indirildi.');
}
