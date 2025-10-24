// Background Script - 处理右键菜单和消息传递
class BackgroundScript {
    constructor() {
        this.menuCreated = false;
        this.init();
    }

    init() {
        this.createContextMenus();
        this.setupMessageListener();
    }

    createContextMenus() {
        // 防止重复创建
        if (this.menuCreated) {
            return;
        }

        // 先清除所有现有菜单项
        chrome.contextMenus.removeAll(() => {
            try {
                // 创建右键菜单
                chrome.contextMenus.create({
                    id: 'addToNotes',
                    title: '添加到笔记',
                    contexts: ['link', 'page']
                });
                this.menuCreated = true;
                console.log('右键菜单创建成功');
            } catch (error) {
                console.log('创建菜单项时出错:', error);
            }
        });

        // 监听右键菜单点击
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'addToNotes') {
                this.handleContextMenuClick(info, tab);
            }
        });
    }

    async handleContextMenuClick(info, tab) {
        let title, url;

        if (info.linkUrl) {
            // 点击的是链接
            title = info.linkText || info.pageTitle || info.linkUrl;
            url = info.linkUrl;
        } else {
            // 点击的是页面
            title = info.pageTitle || tab.title;
            url = info.pageUrl || tab.url;
        }

        // 获取所有领域
        const result = await chrome.storage.local.get(['notesData']);
        const domains = Object.keys(result.notesData || {});

        if (domains.length === 0) {
            // 如果没有领域，先创建领域
            this.showCreateDomainDialog(title, url);
        } else {
            // 显示选择领域对话框
            this.showSelectDomainDialog(domains, title, url);
        }
    }

    showCreateDomainDialog(title, url) {
        // 通过content script显示对话框
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('查询标签页时出错:', chrome.runtime.lastError);
                return;
            }
            
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'showCreateDomainDialog',
                    data: { title, url }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('发送消息时出错:', chrome.runtime.lastError);
                    }
                });
            }
        });
    }

    showSelectDomainDialog(domains, title, url) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('查询标签页时出错:', chrome.runtime.lastError);
                return;
            }
            
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'showSelectDomainDialog',
                    data: { domains, title, url }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('发送消息时出错:', chrome.runtime.lastError);
                    }
                });
            }
        });
    }

    async addNoteToDomain(domainName, title, url) {
        try {
            const result = await chrome.storage.local.get(['notesData']);
            const notesData = result.notesData || {};
            
            if (!notesData[domainName]) {
                notesData[domainName] = [];
            }
            
            notesData[domainName].push({
                title: title,
                url: url,
                timestamp: Date.now()
            });
            
            await chrome.storage.local.set({ notesData: notesData });
            
            // 显示成功提示
            this.showNotification('笔记添加成功！', `已添加到领域: ${domainName}`);
        } catch (error) {
            console.error('添加笔记失败:', error);
            this.showNotification('添加失败', '请重试');
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Background script收到消息:', request);
            if (request.action === 'showAddNoteDialog') {
                this.handleAddNoteRequest(request.data);
            }
            sendResponse({ success: true });
        });
    }

    async handleAddNoteRequest(data) {
        try {
            const { title, url } = data;
            
            // 获取所有领域
            const result = await chrome.storage.local.get(['notesData']);
            const domains = Object.keys(result.notesData || {});

            if (domains.length === 0) {
                this.showCreateDomainDialog(title, url);
            } else {
                this.showSelectDomainDialog(domains, title, url);
            }
        } catch (error) {
            console.error('处理添加笔记请求时出错:', error);
        }
    }

    showNotification(title, message) {
        // 创建通知
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message
            });
        } else {
            // 如果没有通知权限，使用alert
            alert(`${title}: ${message}`);
        }
    }
}

// 初始化background script
const backgroundScript = new BackgroundScript();
