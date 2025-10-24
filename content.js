// Content Script - 处理页面交互
class ContentScript {
    constructor() {
        this.isDragging = false;
        this.dragElement = null;
        this.dragStartTime = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.longPressTimer = null;
        this.init();
    }

    init() {
        this.addDragListeners();
        this.addContextMenuSupport();
        this.addDragHint();
        this.setupMessageListener();
    }

    addDragListeners() {
        // 为搜索结果添加拖拽功能
        this.observeSearchResults();
        
        // 为所有链接添加拖拽功能
        document.addEventListener('mousedown', (e) => {
            const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
            if (link && link.href) {
                this.startLongPress(e, link);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            this.cancelLongPress();
            if (this.isDragging) {
                this.endDrag(e);
            }
        });

        // 添加双击添加功能作为备选方案
        document.addEventListener('dblclick', (e) => {
            const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
            if (link && link.href) {
                this.showAddNoteDialog(link);
            }
        });
    }

    addDragHint() {
        // 添加拖拽提示
        const hint = document.createElement('div');
        hint.id = 'drag-hint';
        hint.innerHTML = '💡 长按链接500ms后拖拽到左上角，或双击链接添加笔记';
        hint.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 123, 255, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10001;
            pointer-events: none;
            animation: fadeInOut 3s ease-in-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // 添加CSS动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(hint);
        
        // 3秒后移除提示
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 3000);
    }

    observeSearchResults() {
        // 观察DOM变化，为新的搜索结果添加拖拽功能
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.addDragToLinks(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    addDragToLinks(element) {
        const links = element.querySelectorAll('a');
        links.forEach(link => {
            if (!link.dataset.dragEnabled) {
                link.dataset.dragEnabled = 'true';
                link.style.cursor = 'grab';
                link.addEventListener('dragstart', (e) => {
                    e.preventDefault();
                });
            }
        });
    }

    startLongPress(e, link) {
        if (!link || !link.href) return;

        // 记录开始位置
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.dragElement = link;
        
        // 设置长按定时器（500ms）
        this.longPressTimer = setTimeout(() => {
            this.startDrag(e, link);
        }, 500);
    }

    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    startDrag(e, link) {
        if (!link || !link.href) return;

        // 记录拖拽开始时间
        this.dragStartTime = Date.now();
        this.isDragging = true;
        
        // 创建拖拽指示器
        this.createDragIndicator();
        
        // 添加拖拽样式
        link.style.opacity = '0.7';
        link.style.transform = 'scale(1.05)';
        link.style.transition = 'all 0.2s ease';
    }

    drag(e) {
        if (!this.isDragging) return;

        const indicator = document.getElementById('drag-indicator');
        if (indicator) {
            indicator.style.left = e.clientX + 'px';
            indicator.style.top = e.clientY + 'px';
        }
    }

    endDrag(e) {
        // 重置状态
        this.isDragging = false;
        this.dragStartTime = 0;
        
        if (!this.dragElement) return;

        // 重置样式
        this.dragElement.style.opacity = '';
        this.dragElement.style.transform = '';
        this.dragElement.style.transition = '';
        
        // 移除拖拽指示器
        const indicator = document.getElementById('drag-indicator');
        if (indicator) {
            indicator.remove();
        }

        // 检查是否拖拽到左上角区域
        if (e.clientX < 150 && e.clientY < 150) {
            this.showAddNoteDialog();
        }

        this.dragElement = null;
    }

    createDragIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'drag-indicator';
        indicator.innerHTML = '📝 拖拽到左上角添加笔记';
        indicator.style.cssText = `
            position: fixed;
            background: #007bff;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(indicator);
    }

    showAddNoteDialog(link = null) {
        const targetLink = link || this.dragElement;
        if (!targetLink) return;

        const url = targetLink.href;
        const title = targetLink.textContent.trim() || targetLink.title || url;

        console.log('发送消息到background script:', { title, url });

        // 发送消息到background script
        chrome.runtime.sendMessage({
            action: 'showAddNoteDialog',
            data: { title, url }
        }, (response) => {
            console.log('Background script响应:', response);
        });
    }

    addContextMenuSupport() {
        // 监听右键菜单点击
        document.addEventListener('contextmenu', (e) => {
            const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
            if (link) {
                // 存储当前链接信息
                chrome.storage.local.set({
                    currentLink: {
                        title: link.textContent.trim() || link.title || link.href,
                        url: link.href
                    }
                });
            }
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'showCreateDomainDialog') {
                this.showCreateDomainDialog(request.data);
            } else if (request.action === 'showSelectDomainDialog') {
                this.showSelectDomainDialog(request.data);
            }
        });
    }

    showCreateDomainDialog(data) {
        const { title, url } = data;
        const domainName = prompt('请先创建一个领域名称:');
        if (domainName && domainName.trim()) {
            this.addNoteToDomain(domainName.trim(), title, url);
        }
    }

    showSelectDomainDialog(data) {
        const { domains, title, url } = data;
        const domainList = domains.map((domain, index) => `${index + 1}. ${domain}`).join('\n');
        const choice = prompt(`选择要添加到的领域:\n${domainList}\n\n请输入数字 (1-${domains.length}):`);
        
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < domains.length) {
            this.addNoteToDomain(domains[index], title, url);
        }
    }

    async addNoteToDomain(domainName, title, url) {
        try {
            const result = await chrome.storage.local.get(['notesData']);
            const notesData = result.notesData || {};
            
            if (!notesData[domainName]) {
                notesData[domainName] = [];
            }
            
            // 清理标题，移除网址信息
            const cleanTitle = this.cleanTitle(title, url);
            
            notesData[domainName].push({
                title: cleanTitle,
                url: url,
                timestamp: Date.now()
            });
            
            await chrome.storage.local.set({ notesData: notesData });
            
            // 显示成功提示
            alert(`笔记添加成功！已添加到领域: ${domainName}`);
        } catch (error) {
            console.error('添加笔记失败:', error);
            alert('添加失败，请重试');
        }
    }

    getDomainName(url) {
        try {
            const domain = new URL(url).hostname;
            // 移除www前缀
            return domain.replace(/^www\./, '');
        } catch {
            return '未知网站';
        }
    }

    cleanTitle(title, url) {
        if (!title || title.trim() === '') {
            return this.getDomainName(url);
        }
        
        let cleanTitle = title.trim();
        
        // 直接截取到http网址之前的内容
        const httpIndex = cleanTitle.indexOf('http');
        if (httpIndex !== -1) {
            cleanTitle = cleanTitle.substring(0, httpIndex).trim();
        }
        
        // 如果清理后为空，使用网站名
        if (!cleanTitle) {
            return this.getDomainName(url);
        }
        
        return cleanTitle;
    }
}

// 初始化content script
const contentScript = new ContentScript();
