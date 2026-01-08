/**
 * Tesla TV - VOD API Client
 * 负责与第三方影视采集接口进行通信
 */

const API_SOURCES = {
    hongniu: {
        name: '红牛资源',
        url: 'https://www.hongniuzy2.com/api.php/provide/vod/at/json',
        type: 'json'
    },
    liangzi: {
        name: '量子资源',
        url: 'https://cj.lziapi.com/api.php/provide/vod/at/json',
        type: 'json'
    },
    feifei: {
        name: '非凡资源 (综合/18+)',
        url: 'https://cj.ffzyapi.com/api.php/provide/vod/from/ffm3u8/at/json',
        type: 'json'
    },
    uku: {
        name: 'Uku资源',
        url: 'https://api.ukuapi.com/api.php/provide/vod/from/uku/at/json',
        type: 'json'
    },
    wolong: {
        name: '卧龙资源',
        url: 'https://collect.wolongzyw.com/api.php/provide/vod/at/json',
        type: 'json'
    },
    guangsu: {
        name: '光速资源',
        url: 'https://api.guangsuapi.com/api.php/provide/vod/from/gsm3u8/at/json',
        type: 'json'
    },
    ikun: {
        name: 'IKUN资源',
        url: 'https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json',
        type: 'json'
    }
};

class VodClient {
    constructor(sourceKey = 'hongniu') {
        this.source = API_SOURCES[sourceKey] || API_SOURCES.hongniu;
        this.timeout = 15000; // 15s timeout
    }

    /**
     * 发送请求 (支持指定 source)
     * @param {Object} params - 查询参数
     * @param {Object} [specificSource] - 临时覆盖的 source 对象
     */
    async _request(params = {}, specificSource = null) {
        const source = specificSource || this.source;
        // 构建目标 URL
        const targetUrl = new URL(source.url);
        Object.keys(params).forEach(key => targetUrl.searchParams.append(key, params[key]));

        const errors = []; // 收集所有策略的错误日志

        // 策略1: 直连 (Direct)
        // 适用于支持 CORS 的 HTTPS 资源站
        try {
            // console.log(`[API] Trying Direct: ${targetUrl}`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000); // 直连 8s 超时

            const response = await fetch(targetUrl, {
                signal: controller.signal,
                referrerPolicy: 'no-referrer'
            });
            clearTimeout(id);

            if (response.ok) {
                return await response.json();
            }
            errors.push(`Direct: HTTP ${response.status}`);
        } catch (e) {
            errors.push(`Direct: ${e.message}`);
        }

        // 策略2: Cloudflare 代理 (CF Proxy)
        try {
            const proxyUrl = new URL('/api/proxy', window.location.origin);
            proxyUrl.searchParams.append('url', btoa(targetUrl.toString())); // Base64 传递完整 URL

            // console.log(`[API] Trying CF Proxy: ${proxyUrl}`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000); // 代理 15s 超时

            const response = await fetch(proxyUrl, {
                signal: controller.signal
            });
            clearTimeout(id);

            if (response.ok) {
                return await response.json();
            }
            // 尝试读取代理返回的错误文本以便调试
            let errInfo = '';
            try { errInfo = (await response.text()).substring(0, 50); } catch (e) { }
            errors.push(`Proxy: HTTP ${response.status} ${errInfo}`);
        } catch (e) {
            errors.push(`Proxy: ${e.message}`);
        }

        // 策略3: 公共代理 (corsproxy.io) - 最后的救命稻草
        try {
            // corsproxy.io 直接在 URL 前加前缀
            const publicProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl.toString())}`;

            // console.log(`[API] Trying Public Proxy: ${publicProxyUrl}`);
            const response = await fetch(publicProxyUrl);

            if (response.ok) {
                return await response.json();
            }
            errors.push(`Public: HTTP ${response.status}`);
        } catch (e) {
            errors.push(`Public: ${e.message}`);
        }

        // 如果到了这里，说明所有策略都失败了
        // console.error('[API] All strategies failed', errors);
        const compositeError = new Error(`Strategies failed for ${source.name}`);
        compositeError.logs = errors; // 附加日志供 UI 显示
        throw compositeError;
    }

    /**
     * 聚合搜索：同时搜索所有源
     * @param {string} keyword 
     */
    async searchAll(keyword) {
        if (!keyword) return [];

        const promises = Object.entries(API_SOURCES).map(async ([key, source]) => {
            try {
                // 复用 _request 但传入 source context
                const data = await this._request({ ac: 'detail', wd: keyword }, source);
                const list = data.list || [];

                // 标记来源
                return list.map(item => ({
                    ...item,
                    sourceKey: key,
                    sourceName: source.name
                }));
            } catch (e) {
                console.warn(`[Search] Source ${source.name} failed:`, e);
                return [];
            }
        });

        // 使用 allSettled 允许部分失败
        const results = await Promise.allSettled(promises);

        // 合并结果
        let allList = [];
        results.forEach(res => {
            if (res.status === 'fulfilled') {
                allList = allList.concat(res.value);
            }
        });

        return allList;
    }

    /**
     * 获取首页多分类数据
     * 平行请求: 电影(1), 剧集(2), 综艺(3), 动漫(4)
     */
    async getHomeSections() {
        // 定义要展示的板块
        const categories = [
            { id: 1, title: '🎬 最新电影' },
            { id: 2, title: '📺 热门剧集' },
            { id: 4, title: '🌸 动漫番剧' }, // ID 4 通常是动漫
            { id: 3, title: '🤣 综艺娱乐' }  // ID 3 通常是综艺
        ];

        // 对每个板块并行发起请求 (使用当前选中的源)
        const promises = categories.map(async cat => {
            try {
                const data = await this._request({
                    ac: 'detail',
                    t: cat.id,
                    pg: 1,
                    pagesize: 12 // 每行展示 12 个
                });
                return {
                    title: cat.title,
                    typeId: cat.id,
                    list: data.list || []
                };
            } catch (e) {
                console.warn(`[Home] Category ${cat.title} failed:`, e);
                return { title: cat.title, typeId: cat.id, list: [] };
            }
        });

        const sections = await Promise.all(promises);
        // 只返回有数据的板块
        return sections.filter(s => s.list.length > 0);
    }

    /**
     * 获取首页推荐数据 (兼容旧方法，作为单源后备)
     */
    async getHomeData() {
        const data = await this._request({
            ac: 'detail',
            pg: 1,
            pagesize: 24
        });
        return data.list || [];
    }

    /**
     * 搜索视频 (单源)
     */
    async search(keyword) {
        if (!keyword) return [];
        const data = await this._request({
            ac: 'detail',
            wd: keyword
        });
        return data.list || [];
    }

    /**
     * 获取视频详情
     */
    async getDetail(id) {
        const data = await this._request({
            ac: 'detail',
            ids: id
        });
        return data.list && data.list.length > 0 ? data.list[0] : null;
    }

    /**
     * 获取分类数据
     */
    async getCategory(typeId, page = 1) {
        const data = await this._request({
            ac: 'detail',
            t: typeId,
            pg: page,
            pagesize: 20
        });
        return {
            list: data.list || [],
            total: data.total,
            page: parseInt(data.page),
            pagecount: data.pagecount
        };
    }

    /**
     * 获取分类列表结构
     */
    async getTypes() {
        const data = await this._request({
            ac: 'list',
            pagesize: 1
        });
        return data.class || [];
    }

    /**
     * 切换数据源
     */
    setSource(sourceKey) {
        if (API_SOURCES[sourceKey]) {
            this.source = API_SOURCES[sourceKey];
            console.log(`[API] Switched source to: ${this.source.name}`);
        }
    }

    getSources() {
        return API_SOURCES;
    }
}

// 导出单例
const vodApi = new VodClient();
window.vodApi = vodApi;
