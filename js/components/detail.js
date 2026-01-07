/**
 * Tesla TV - Detail Modal Component
 * 处理视频详情展示、选集播放
 */

class DetailModal {
    constructor() {
        this.modal = document.getElementById('debug-modal'); // 复用或新建
        // 动态创建模态框 DOM 如果不存在
        if (!document.getElementById('detailModal')) {
            this._createModal();
        }

        this.el = document.getElementById('detailModal');
        this.bindEvents();
    }

    _createModal() {
        const div = document.createElement('div');
        div.id = 'detailModal';
        div.className = 'player-modal detail-modal'; // 复用 player-modal 样式基础
        div.style.display = 'none';

        div.innerHTML = `
            <div class="detail-container">
                <button class="close-btn" id="closeDetailBtn">✕</button>
                <div class="detail-content">
                    <div class="detail-left">
                        <div class="detail-poster" id="detailPoster"></div>
                    </div>
                    <div class="detail-right">
                        <h2 class="detail-title" id="detailTitle"></h2>
                        <div class="detail-meta" id="detailMeta"></div>
                        <p class="detail-desc" id="detailDesc"></p>
                        
                        <div class="episode-section">
                            <h3>选集播放</h3>
                            <div class="episode-tabs" id="episodeTabs">
                                <!-- 线路 Tab -->
                            </div>
                            <div class="episode-list" id="episodeList">
                                <!-- 集数按钮 -->
                            </div>
                        </div>

                        <div class="detail-actions">
                            <button class="btn btn-primary" id="detailPlayBtn">▶ 立即播放</button>
                            <button class="btn btn-secondary" id="detailFavBtn">❤ 收藏</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(div);

        // 添加额外样式
        const style = document.createElement('style');
        style.innerHTML = `
            .detail-modal {
                background: rgba(0, 0, 0, 0.9);
                overflow-y: auto;
                padding-top: 60px;
                display: none;
                flex-direction: column;
                align-items: center;
            }
            .detail-modal.active {
                display: flex;
            }
            .detail-container {
                width: 90%;
                max-width: 1000px;
                background: #181818;
                border-radius: 8px;
                position: relative;
                padding: 40px;
                margin-bottom: 40px;
            }
            .detail-content {
                display: flex;
                gap: 40px;
            }
            .detail-left {
                flex-shrink: 0;
                width: 240px;
            }
            .detail-poster {
                width: 100%;
                aspect-ratio: 2/3;
                background-size: cover;
                background-position: center;
                border-radius: 4px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .detail-right {
                flex: 1;
            }
            .detail-title {
                font-size: 32px;
                margin-bottom: 12px;
            }
            .detail-meta {
                color: #b3b3b3;
                font-size: 14px;
                margin-bottom: 20px;
                line-height: 1.6;
            }
            .detail-desc {
                color: #999;
                font-size: 15px;
                line-height: 1.6;
                margin-bottom: 30px;
                max-height: 100px;
                overflow-y: auto;
            }
            .episode-section h3 {
                font-size: 18px;
                margin-bottom: 12px;
                border-left: 3px solid #e50914;
                padding-left: 10px;
            }
            .episode-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                gap: 10px;
                max-height: 200px;
                overflow-y: auto;
                padding: 10px 0;
            }
            .ep-btn {
                background: #333;
                border: 1px solid #444;
                color: #fff;
                padding: 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ep-btn:hover {
                background: #444;
                border-color: #666;
            }
            .ep-btn.active {
                background: #e50914;
                border-color: #e50914;
            }
            .detail-actions {
                margin-top: 30px;
                display: flex;
                gap: 16px;
            }
            #closeDetailBtn {
                position: absolute;
                top: 20px;
                right: 20px;
                background: transparent;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
            }
            
            @media (max-width: 768px) {
                .detail-content { flex-direction: column; }
                .detail-left { width: 100%; max-width: 200px; margin: 0 auto; }
                .detail-container { padding: 20px; }
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        this.el.querySelector('#closeDetailBtn').onclick = () => this.hide();
        this.el.querySelector('#detailFavBtn').onclick = () => this.toggleFav();

        // 点击遮罩关闭
        this.el.onclick = (e) => {
            if (e.target === this.el) this.hide();
        };
    }

    async show(vodId) {
        if (!vodId) return;

        // 显示加载
        this.el.classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            const data = await window.vodApi.getDetail(vodId);
            if (data) {
                this.currentVod = data;
                this.render(data);
            } else {
                alert('获取视频详情失败');
                this.hide();
            }
        } catch (e) {
            console.error(e);
            alert('网络错误');
            this.hide();
        }
    }

    hide() {
        this.el.classList.remove('active');
        document.body.style.overflow = '';
    }

    render(vod) {
        const el = this.el;
        el.querySelector('#detailTitle').textContent = vod.vod_name;
        el.querySelector('#detailPoster').style.backgroundImage = `url("${vod.vod_pic}")`;
        el.querySelector('#detailDesc').innerHTML = vod.vod_content || '暂无简介';

        const meta = [
            `<span>类型: ${vod.type_name}</span>`,
            `<span>地区: ${vod.vod_area}</span>`,
            `<span>年份: ${vod.vod_year}</span>`,
            `<span>主演: ${vod.vod_actor}</span>`,
            `<span>更新: ${vod.vod_time}</span>`
        ].join(' &nbsp;|&nbsp; ');
        el.querySelector('#detailMeta').innerHTML = meta;

        // 渲染收藏状态
        this.updateFavBtn();

        // 渲染剧集
        this.renderEpisodes(vod);

        // 绑定播放按钮 (默认播放第一集)
        const playBtn = el.querySelector('#detailPlayBtn');
        playBtn.onclick = () => {
            if (this.episodes && this.episodes.length > 0) {
                // 检查是否有历史记录
                const history = window.store.getHistory(vod.vod_id);
                if (history && history.episodeUrl) {
                    this.play(history.episodeUrl, history.title);
                } else {
                    this.play(this.episodes[0].url, this.episodes[0].name);
                }
            }
        };
    }

    renderEpisodes(vod) {
        const listEl = this.el.querySelector('#episodeList');
        listEl.innerHTML = '';

        // 解析播放地址
        // 格式通常是: "第01集$http://...#第02集$http://..."
        // 可能有多个播放源，用 $$$ 分隔
        let playData = vod.vod_play_url;
        if (!playData) return;

        // 智能优选逻辑
        const sources = playData.split('$$$');
        let targetSource = this.selectBestSource(sources);
        if (!targetSource) targetSource = sources[0];

        const episodes = targetSource.split('#').map(ep => {
            const [name, url] = ep.split('$');
            return { name, url };
        });

        this.episodes = episodes;

        episodes.forEach((ep, index) => {
            const btn = document.createElement('button');
            btn.className = 'ep-btn';
            btn.textContent = ep.name;
            btn.onclick = () => this.play(ep.url, ep.name);
            listEl.appendChild(btn);
        });
    }

    play(url, title) {
        // 调用全局播放函数 (在 index.html 定义)
        if (window.playVideo) {
            window.playVideo(url, `${this.currentVod.vod_name} - ${title}`);
            // 记录历史
            window.store.saveHistory(this.currentVod.vod_id, {
                title: title,
                episodeUrl: url,
                vodTitle: this.currentVod.vod_name
            });
        }
    }

    toggleFav() {
        if (!this.currentVod) return;
        const id = this.currentVod.vod_id;
        if (window.store.isFavorite(id)) {
            window.store.removeFavorite(id);
        } else {
            window.store.addFavorite(this.currentVod);
        }
        this.updateFavBtn();
    }

    /**
     * 智能选择最佳播放源
     * 规则：优先 m3u8 > mp4，优先 HD/1080P，随机负载均衡
     */
    selectBestSource(sources) {
        if (!sources || sources.length === 0) return null;

        // 1. 筛选可用源 (优先 m3u8)
        const candidates = sources.filter(s => s.includes('.m3u8') || s.includes('.mp4'));
        if (candidates.length === 0) return sources[0];

        // 2. 评分 (包含高清标识加分)
        const scored = candidates.map(s => {
            let score = 0;
            if (s.includes('.m3u8')) score += 10;
            if (s.includes('1080P') || s.includes('1080p')) score += 5;
            if (s.includes('HD') || s.includes('高清')) score += 3;
            // 避免特定坏源 (示例)
            if (s.includes('http:')) score -= 2; // 优先 HTTPS
            return { source: s, score };
        });

        // 3. 排序
        scored.sort((a, b) => b.score - a.score);

        // 4. 取最高分的几个 (随机选择以均衡负载)
        const topScore = scored[0].score;
        const topTier = scored.filter(s => s.score === topScore);

        return topTier[Math.floor(Math.random() * topTier.length)].source;
    }

    updateFavBtn() {
        const btn = this.el.querySelector('#detailFavBtn');
        const isFav = window.store.isFavorite(this.currentVod.vod_id);
        btn.textContent = isFav ? '❤ 已收藏' : '🤍 收藏';
        btn.style.color = isFav ? '#e50914' : '#fff';
    }
}

// 导出
window.DetailModal = DetailModal;
