/**
 * Export & Download Module (Docx, TXT, SRT, Clipboard)
 */
import { state } from './state.js';
import { downloadBlob, formatSrtTime, sanitizeFileName, showAlert, showToast } from './utils.js';

export async function exportDocx() {
    if (!state.transcript || !state.transcript.items || state.transcript.items.length === 0) {
        showAlert('Dışa aktarılacak transkript bulunamadı.');
        return;
    }

    const btn = document.getElementById('downloadDocxBtn');
    const originalText = btn ? btn.querySelector('span').textContent : '';

    try {
        if (btn) {
            btn.querySelector('span').textContent = 'Oluşturuluyor...';
            btn.disabled = true;
        }

        const payload = {
            title: state.transcript.title || (state.metadata ? state.metadata.title : 'Transkript'),
            author: state.transcript.author || (state.metadata ? state.metadata.author : ''),
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
    } catch (err) {
        console.error(err);
        showAlert(err.message || 'Word dosyası indirilirken hata oluştu.');
    } finally {
        if (btn) {
            btn.querySelector('span').textContent = originalText;
            btn.disabled = false;
        }
    }
}

export function exportTxt() {
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

export function exportSrt() {
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
