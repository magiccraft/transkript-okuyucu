/**
 * Speech Synthesis & Audio Pronunciation Module
 */
import { showToast } from './utils.js';

export function speakWord(text, lang = 'en', audioUrl = null) {
    if (!text) return;

    if (audioUrl) {
        try {
            const audio = new Audio(audioUrl);
            audio.play().catch(() => playSpeechSynthesis(text, lang));
            return;
        } catch (e) {
            // Fallback to speech synthesis
        }
    }

    playSpeechSynthesis(text, lang);
}

function playSpeechSynthesis(text, lang = 'en') {
    if (!('speechSynthesis' in window)) {
        showToast('Tarayıcınız ses sentezini desteklemiyor.');
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang.startsWith('tr') ? 'tr-TR' : 'en-US';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
        const targetVoice = voices.find(v => v.lang.startsWith(utterance.lang) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')))
            || voices.find(v => v.lang.startsWith(utterance.lang));
        if (targetVoice) {
            utterance.voice = targetVoice;
        }
    }

    window.speechSynthesis.speak(utterance);
}
