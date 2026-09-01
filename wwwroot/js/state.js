/**
 * Application State
 */
export const state = {
    currentVideoUrl: '',
    currentVideoId: '',
    metadata: null,
    transcript: null,
    activeItemIndex: -1,
    syncInterval: null,
    
    // Search
    searchQuery: '',
    searchMatchIndices: [],
    currentSearchMatchIndex: -1,
    
    // YouTube Player State
    player: null,
    isPlayerReady: false,
    isPlaying: false,
    durationSeconds: 0,
    isDraggingProgress: false,
    hideControlsTimeout: null,
    volume: 100,
    isMuted: false,
    playbackSpeed: 1,
    repeatIndex: -1,
    pendingSeekTime: 0,
    
    // Auto-scroll intent
    isUserScrolling: false,
    userScrollResumeTimeout: null
};
