/**
 * 游戏 × AI 资讯 - 主应用逻辑
 * 
 * 功能：
 * - 从 data/ 目录加载 JSON 数据
 * - 分类筛选
 * - 日期切换（URL hash + 按钮导航）
 * - 展开/收起详情
 * - 统计信息更新
 */

(function () {
  'use strict';

  // ==========================================================================
  // 配置
  // ==========================================================================

  const CATEGORIES = {
    'creation': 'AI 游戏生成与创作',
    'in-game': '游戏内 AI 体验',
    'dev-tools': '游戏开发 AI 工具',
    'ops': '游戏运营&商业化 AI 实践',
    'industry': '游戏行业&公司 AI 动态',
    'research': '游戏 AI 应用前沿研究'
  };

  // ==========================================================================
  // 状态
  // ==========================================================================

  let currentData = null;       // 当前加载的数据
  let currentDate = null;       // 当前日期字符串 (YYYY-MM-DD)
  let currentFilter = 'all';    // 当前筛选分类
  let expandedItems = new Set(); // 已展开的条目索引

  // ==========================================================================
  // DOM 引用
  // ==========================================================================

  const $loading = document.getElementById('loading');
  const $error = document.getElementById('error');
  const $errorMessage = document.getElementById('error-message');
  const $newsList = document.getElementById('news-list');
  const $currentDate = document.getElementById('current-date');
  const $prevDate = document.getElementById('prev-date');
  const $nextDate = document.getElementById('next-date');
  const $statsTotal = document.getElementById('stats-total');
  const $statsFiltered = document.getElementById('stats-filtered');
  const $filterBar = document.getElementById('filter-bar');

  // ==========================================================================
  // 数据加载
  // ==========================================================================

  /**
   * 根据日期加载数据文件
   * @param {string|null} date - 日期 (YYYY-MM-DD) 或 null 表示加载 latest
   */
  async function loadData(date) {
    showLoading();
    hideError();
    $newsList.innerHTML = '';

    const filename = date ? `data/${date}.json` : 'data/latest.json';

    try {
      const response = await fetch(filename);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? `未找到 ${date || '最新'} 的数据文件`
            : `加载失败 (HTTP ${response.status})`
        );
      }

      currentData = await response.json();
      currentDate = currentData.date || date;

      // 更新 URL hash（不触发 hashchange）
      if (currentDate) {
        history.replaceState(null, '', `#${currentDate}`);
      }

      hideLoading();
      render();
    } catch (err) {
      hideLoading();
      showError(err.message);
    }
  }

  // ==========================================================================
  // 渲染
  // ==========================================================================

  /** 渲染整个页面（日期、统计、列表） */
  function render() {
    if (!currentData) return;

    renderDate();
    renderStats();
    renderFilterCounts();
    renderList();
  }

  /** 更新日期显示 */
  function renderDate() {
    $currentDate.textContent = currentDate || '--';
  }

  /** 更新统计信息 */
  function renderStats() {
    const total = currentData.items ? currentData.items.length : 0;
    const filtered = getFilteredItems().length;
    $statsTotal.textContent = total;
    $statsFiltered.textContent = filtered;
  }

  /** 更新分类标签计数 */
  function renderFilterCounts() {
    const stats = currentData.stats && currentData.stats.by_category
      ? currentData.stats.by_category
      : {};

    document.querySelectorAll('.tag-count').forEach(el => {
      const cat = el.getAttribute('data-count');
      const count = stats[cat] || 0;
      el.textContent = count > 0 ? count : '';
    });
  }

  /** 渲染资讯列表 */
  function renderList() {
    const items = getFilteredItems();
    $newsList.innerHTML = '';

    if (items.length === 0) {
      $newsList.innerHTML = '<li class="empty-state" style="padding:40px 0;text-align:center;color:#999;font-size:14px;">暂无数据</li>';
      return;
    }

    items.forEach((item, idx) => {
      $newsList.appendChild(createNewsItem(item, idx));
    });

    // 更新筛选后的统计
    $statsFiltered.textContent = items.length;
  }

  /**
   * 创建单条资讯 DOM 元素
   * @param {Object} item - 资讯数据
   * @param {number} idx - 序号（0-based）
   * @returns {HTMLLIElement}
   */
  function createNewsItem(item, idx) {
    const li = document.createElement('li');
    li.className = 'news-item';
    if (expandedItems.has(idx)) {
      li.classList.add('expanded');
    }

    // 格式化日期
    const dateStr = item.published_at
      ? formatDate(item.published_at)
      : '';

    // 转载标记
    const repostBadge = item.source_type === 'secondary'
      ? '<span class="news-repost">转载</span>'
      : '';

    // 分类标签
    const categoryTag = item.category && CATEGORIES[item.category]
      ? `<span class="news-category-tag" data-category="${escapeHtml(item.category)}">${escapeHtml(CATEGORIES[item.category])}</span>`
      : '';

    // Header（可点击展开）
    const header = document.createElement('div');
    header.className = 'news-item-header';
    header.innerHTML = `
      <span class="news-index">${idx + 1}.</span>
      <div class="news-content">
        <div class="news-title-row">
          <span class="news-title"><a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(item.title)}</a></span>
          ${repostBadge}
        </div>
        <div class="news-meta">
          <span class="news-source">${escapeHtml(item.source || '')}</span>
          <span class="news-date">${dateStr}</span>
          ${categoryTag}
        </div>
      </div>
      <svg class="news-expand-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,3 11,8 6,13"/>
      </svg>
    `;

    // 阻止链接点击冒泡后，绑定展开事件到 header
    header.addEventListener('click', () => {
      toggleExpand(li, idx);
    });

    // Detail（展开内容）
    const detail = document.createElement('div');
    detail.className = 'news-detail' + (expandedItems.has(idx) ? ' open' : '');

    let detailHTML = '';
    if (item.summary) {
      detailHTML += `
        <div class="news-detail-section">
          <div class="news-detail-label">摘要</div>
          <div class="news-detail-text">${escapeHtml(item.summary)}</div>
        </div>
      `;
    }
    if (item.recommendation) {
      detailHTML += `
        <div class="news-detail-section">
          <div class="news-detail-label">推荐原因</div>
          <div class="news-detail-text">${escapeHtml(item.recommendation)}</div>
        </div>
      `;
    }
    detail.innerHTML = detailHTML || '<div class="news-detail-text" style="color:#999">暂无详细信息</div>';

    li.appendChild(header);
    li.appendChild(detail);
    return li;
  }

  /** 展开/收起条目 */
  function toggleExpand(li, idx) {
    const detail = li.querySelector('.news-detail');
    if (expandedItems.has(idx)) {
      expandedItems.delete(idx);
      li.classList.remove('expanded');
      detail.classList.remove('open');
    } else {
      expandedItems.add(idx);
      li.classList.add('expanded');
      detail.classList.add('open');
    }
  }

  // ==========================================================================
  // 筛选
  // ==========================================================================

  /** 获取当前筛选后的条目列表 */
  function getFilteredItems() {
    if (!currentData || !currentData.items) return [];

    const items = [...currentData.items];

    // 按时间倒序排列
    items.sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });

    if (currentFilter === 'all') return items;
    return items.filter(item => item.category === currentFilter);
  }

  /** 设置筛选分类 */
  function setFilter(category) {
    currentFilter = category;
    expandedItems.clear();

    // 更新按钮状态
    document.querySelectorAll('.filter-tag').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });

    renderList();
    renderStats();
  }

  // ==========================================================================
  // 日期导航
  // ==========================================================================

  /** 切换到前一天 */
  function goToPrevDate() {
    if (!currentDate) return;
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    const newDate = formatISODate(date);
    loadData(newDate);
  }

  /** 切换到后一天 */
  function goToNextDate() {
    if (!currentDate) return;
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 1);
    const newDate = formatISODate(date);
    loadData(newDate);
  }

  // ==========================================================================
  // 工具函数
  // ==========================================================================

  /** 格式化 ISO 日期为可读格式 */
  function formatDate(isoStr) {
    try {
      const d = new Date(isoStr);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hours}:${mins}`;
    } catch {
      return '';
    }
  }

  /** Date 对象转 YYYY-MM-DD */
  function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** HTML 转义 */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** 从 URL hash 获取日期 */
  function getDateFromHash() {
    const hash = window.location.hash.slice(1);
    // 验证格式 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(hash)) {
      return hash;
    }
    return null;
  }

  // ==========================================================================
  // UI 状态切换
  // ==========================================================================

  function showLoading() {
    $loading.style.display = 'flex';
  }

  function hideLoading() {
    $loading.style.display = 'none';
  }

  function showError(msg) {
    $errorMessage.textContent = msg;
    $error.style.display = 'block';
  }

  function hideError() {
    $error.style.display = 'none';
  }

  // ==========================================================================
  // 事件绑定
  // ==========================================================================

  function bindEvents() {
    // 分类筛选
    $filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-tag');
      if (!btn) return;
      const category = btn.getAttribute('data-category');
      if (category) setFilter(category);
    });

    // 日期导航
    $prevDate.addEventListener('click', goToPrevDate);
    $nextDate.addEventListener('click', goToNextDate);

    // URL hash 变化
    window.addEventListener('hashchange', () => {
      const date = getDateFromHash();
      if (date && date !== currentDate) {
        expandedItems.clear();
        currentFilter = 'all';
        document.querySelectorAll('.filter-tag').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-category') === 'all');
        });
        loadData(date);
      }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goToPrevDate();
      if (e.key === 'ArrowRight') goToNextDate();
    });
  }

  // ==========================================================================
  // 初始化
  // ==========================================================================

  function init() {
    bindEvents();

    // 从 hash 确定要加载的日期
    const hashDate = getDateFromHash();
    loadData(hashDate);
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
