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
        url: 'http://cj.ffzyapi.com/api.php/provide/vod/from/ffm3u8/at/json',
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
        this.timeout = 10000; // 10s timeout
    }

    /**
     * 发送请求
     * @param {Object} params - 查询参数
     */

    // 使用 Cloudflare Functions 代理
    // 目标: /api/proxy?url=ENCODED_TARGET_URL&other_params...
    const proxyUrl = new URL('/api/proxy', window.location.origin);
        proxyUrl.searchParams.append('url', this.source.url);

        // 追加其他业务参数
        Object.keys(params).forEach(key => proxyUrl.searchParams.append(key, params[key]));

const controller = new AbortController();
const id = setTimeout(() => controller.abort(), this.timeout);

try {
    console.log(`[API] Proxy Request: ${proxyUrl.toString()}`);
    const response = await fetch(proxyUrl, {
        signal: controller.signal,
        referrerPolicy: 'no-referrer'
    });
    clearTimeout(id);

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
} catch (error) {
    clearTimeout(id);
    console.error('[API] Request failed:', error);
    throw error;
}
    }

    /**
     * 获取首页推荐数据 (最近更新/热门)
     * 通常采集接口没有专门的"推荐"接口，我们获取最新的几十条数据作为首页内容
     */
    async getHomeData() {
    // 获取最新更新的 24 条视频
    const data = await this._request({
        ac: 'detail', // 使用 detail 获取详细信息(含图片)
        pg: 1,
        pagesize: 24
    });
    return data.list || [];
}

    /**
     * 搜索视频
     * @param {string} keyword - 关键词
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
     * @param {string|number} id - 视频 ID
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
     * @param {string|number} typeId - 分类 ID
     * @param {number} page - 页码
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
     * 获取所有分类列表
     * 注意：采集接口的分类列表通常在列表接口返回
     */
    async getTypes() {
    // 请求列表页来获取 class 分类结构
    const data = await this._request({
        ac: 'list',
        pagesize: 1 // 最小请求
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

/**
 * 获取所有可用源列表
 */
getSources() {
    return API_SOURCES;
}
}

// 导出单例
const vodApi = new VodClient();
window.vodApi = vodApi; // 挂载到全局，方便调试
