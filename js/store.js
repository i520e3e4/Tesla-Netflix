/**
 * Tesla TV - Local Storage Manager
 * 管理本地持久化数据：观看记录、收藏夹、设置
 */

const STORAGE_KEYS = {
    HISTORY: 'teslatv_history',
    FAVORITES: 'teslatv_favorites',
    SETTINGS: 'teslatv_settings',
    SEARCH_HISTORY: 'teslatv_search_history'
};

class Store {
    constructor() {
        this.history = this._load(STORAGE_KEYS.HISTORY, {});
        this.favorites = this._load(STORAGE_KEYS.FAVORITES, []);
        this.searchHistory = this._load(STORAGE_KEYS.SEARCH_HISTORY, []);
        this.settings = this._load(STORAGE_KEYS.SETTINGS, {
            source: 'hongniu', // 默认源
            skipIntro: false,  // 跳过片头
            autoSkipOutro: false, // 跳过片尾
            adBlock: false,     // 广告屏蔽
            speed: 1.0          // 播放速度
        });
    }

    _load(key, defaultVal) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultVal;
        } catch (e) {
            console.error('Failed to load storage:', key, e);
            return defaultVal;
        }
    }

    _save(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error('Failed to save storage:', key, e);
        }
    }

    // ===========================
    // History Methods
    // ===========================

    /**
     * 保存播放进度
     * @param {string} vodId - 视频 ID
     * @param {Object} data - { time: 120, duration: 3600, episodeUrl: '...', epIndex: 0, title: '...' }
     */
    saveHistory(vodId, data) {
        if (!vodId) return;
        this.history[vodId] = {
            ...data,
            updatedAt: Date.now()
        };
        // 清理旧记录，只保留最近 100 条
        const keys = Object.keys(this.history);
        if (keys.length > 100) {
            // 简单的清理策略：删除最旧的（并不严格按时间，因为 Object.keys 顺序不定，但够用了）
            // 严谨点应该转数组排序
            const sortedKeys = keys.sort((a, b) => this.history[a].updatedAt - this.history[b].updatedAt);
            if (sortedKeys.length > 100) {
                delete this.history[sortedKeys[0]];
            }
        }
        this._save(STORAGE_KEYS.HISTORY, this.history);
    }

    /**
     * 获取播放进度
     * @param {string} vodId 
     */
    getHistory(vodId) {
        return this.history[vodId];
    }

    /**
     * 获取所有历史记录 (按时间倒序)
     */
    getAllHistory() {
        return Object.values(this.history).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // ===========================
    // Favorites Methods
    // ===========================

    addFavorite(vod) {
        // 查重
        if (this.isFavorite(vod.vod_id)) return;

        this.favorites.unshift({
            id: vod.vod_id,
            name: vod.vod_name,
            pic: vod.vod_pic,
            type: vod.type_name,
            addedAt: Date.now()
        });
        this._save(STORAGE_KEYS.FAVORITES, this.favorites);
    }

    removeFavorite(vodId) {
        this.favorites = this.favorites.filter(item => item.id != vodId);
        this._save(STORAGE_KEYS.FAVORITES, this.favorites);
    }

    isFavorite(vodId) {
        return this.favorites.some(item => item.id == vodId);
    }

    getFavorites() {
        return this.favorites;
    }
    // ===========================
    // Search History Methods
    // ===========================

    addSearchHistory(keyword) {
        if (!keyword) return;
        // 移除旧的同名记录
        this.searchHistory = this.searchHistory.filter(k => k !== keyword);
        // 添加到头部
        this.searchHistory.unshift(keyword);
        // 限制长度
        if (this.searchHistory.length > 20) {
            this.searchHistory.pop();
        }
        this._save(STORAGE_KEYS.SEARCH_HISTORY, this.searchHistory);
    }

    getSearchHistory() {
        return this.searchHistory;
    }

    // ===========================
    // Settings Methods
    // ===========================

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this._save(STORAGE_KEYS.SETTINGS, this.settings);
    }

    getSettings() {
        return this.settings;
    }
}

const store = new Store();
window.store = store;
