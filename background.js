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
                try {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'showCreateDomainDialog',
                        data: { title, url }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('发送消息时出错:', chrome.runtime.lastError);
                            // 如果content script没有响应，直接显示对话框
                            this.showCreateDomainFallback(title, url);
                        }
                    });
                } catch (error) {
                    console.error('发送消息异常:', error);
                    this.showCreateDomainFallback(title, url);
                }
            }
        });
    }

    showCreateDomainFallback(title, url) {
        // background script无法使用prompt，使用默认领域名
        const domainName = '默认领域';
        console.log('使用默认领域:', domainName);
        this.addNoteToDomain(domainName, title, url);
    }

    showSelectDomainDialog(domains, title, url) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (chrome.runtime.lastError) {
                console.error('查询标签页时出错:', chrome.runtime.lastError);
                return;
            }
            
            if (tabs[0]) {
                try {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'showSelectDomainDialog',
                        data: { domains, title, url }
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('发送消息时出错:', chrome.runtime.lastError);
                            // 如果content script没有响应，直接显示对话框
                            this.showFallbackDialog(domains, title, url);
                        }
                    });
                } catch (error) {
                    console.error('发送消息异常:', error);
                    this.showFallbackDialog(domains, title, url);
                }
            }
        });
    }

    showFallbackDialog(domains, title, url) {
        try {
            // background script无法使用prompt，直接添加到第一个领域
            if (domains.length > 0) {
                console.log('自动添加到第一个领域:', domains[0]);
                this.addNoteToDomain(domains[0], title, url);
            } else {
                console.log('没有可用的领域');
            }
        } catch (error) {
            console.error('显示fallback对话框时出错:', error);
        }
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
        // 使用console.log记录，避免通知权限问题
        console.log(`${title}: ${message}`);
        
        // 尝试发送消息到popup显示通知
        try {
            chrome.runtime.sendMessage({
                action: 'showNotification',
                title: title,
                message: message
            });
        } catch (error) {
            console.log('无法发送通知消息:', error);
        }
    }
}

// 初始化background script
const backgroundScript = new BackgroundScript();
