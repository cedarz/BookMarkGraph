// Background Script - 处理右键菜单和消息传递
class BackgroundScript {
    constructor() {
        this.menuCreated = false;
        this.init();
    }

    async init() {
        this.createContextMenus();
        this.setupMessageListener();
        await this.updateContextMenus();
    }

    createContextMenus() {
        // 防止重复创建
        if (this.menuCreated) {
            return;
        }

        // 先清除所有现有菜单项
        chrome.contextMenus.removeAll(() => {
            try {
                // 创建主菜单
                chrome.contextMenus.create({
                    id: 'notesManager',
                    title: '笔记管理器',
                    contexts: ['link', 'page']
                });

                // 创建一级子菜单
                chrome.contextMenus.create({
                    id: 'addCurrentPage',
                    parentId: 'notesManager',
                    title: '添加当前页到',
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
            if (info.menuItemId === 'createDomain') {
                this.handleCreateDomain(info, tab);
            } else if (info.menuItemId.startsWith('domain_')) {
                this.handleDomainClick(info, tab);
            }
        });
    }

    async updateContextMenus() {
        try {
            // 获取所有领域
            const result = await chrome.storage.local.get(['notesData']);
            let domains = Object.keys(result.notesData || {});
            
            // 如果没有领域，创建默认领域
            if (domains.length === 0) {
                await this.createDefaultDomain();
                domains = ['默认领域'];
            }
            
            // 清除现有的领域菜单项
            chrome.contextMenus.removeAll(() => {
                try {
                    // 创建主菜单
                    chrome.contextMenus.create({
                        id: 'notesManager',
                        title: '笔记管理器',
                        contexts: ['link', 'page']
                    });

                    // 创建一级子菜单
                    chrome.contextMenus.create({
                        id: 'addCurrentPage',
                        parentId: 'notesManager',
                        title: '添加当前页到',
                        contexts: ['link', 'page']
                    });
                    
                    // 为每个领域创建二级子菜单项
                    domains.forEach((domain, index) => {
                        chrome.contextMenus.create({
                            id: `domain_${index}`,
                            parentId: 'addCurrentPage',
                            title: domain,
                            contexts: ['link', 'page']
                        });
                    });

                    // 添加"创建新领域"选项作为一级子菜单
                    chrome.contextMenus.create({
                        id: 'createDomain',
                        parentId: 'notesManager',
                        title: '创建新领域',
                        contexts: ['link', 'page']
                    });
                } catch (error) {
                    console.error('创建菜单项时出错:', error);
                }
            });
        } catch (error) {
            console.error('更新右键菜单失败:', error);
        }
    }

    async createDefaultDomain() {
        try {
            // 创建默认领域
            const result = await chrome.storage.local.get(['notesData']);
            const notesData = result.notesData || {};
            
            if (!notesData['默认领域']) {
                notesData['默认领域'] = [];
                await chrome.storage.local.set({ notesData });
                console.log('已创建默认领域');
            }
        } catch (error) {
            console.error('创建默认领域失败:', error);
        }
    }

    async handleCreateDomain(info, tab) {
        let title, url;

        if (info.linkUrl) {
            // 点击的是链接，优先使用页面标题
            title = info.pageTitle || tab.title || info.linkText || info.linkUrl;
            url = info.linkUrl;
        } else {
            // 点击的是页面
            title = info.pageTitle || tab.title;
            url = info.pageUrl || tab.url;
        }

        // 直接创建新领域
        this.showCreateDomainDialog(title, url);
    }

    async handleDomainClick(info, tab) {
        let title, url;

        if (info.linkUrl) {
            // 点击的是链接，优先使用页面标题
            title = info.pageTitle || tab.title || info.linkText || info.linkUrl;
            url = info.linkUrl;
        } else {
            // 点击的是页面
            title = info.pageTitle || tab.title;
            url = info.pageUrl || tab.url;
        }

        // 获取领域名称
        const domainIndex = parseInt(info.menuItemId.replace('domain_', ''));
        const result = await chrome.storage.local.get(['notesData']);
        const domains = Object.keys(result.notesData || {});
        const domainName = domains[domainIndex];

        if (domainName) {
            // 直接添加到指定领域
            this.addNoteToDomain(domainName, title, url);
        }
    }

    showCreateDomainDialog(title, url) {
        // 直接使用fallback，避免消息传递问题
        this.showCreateDomainFallback(title, url);
    }

    showCreateDomainFallback(title, url) {
        // background script无法使用prompt，使用默认领域名
        const domainName = '默认领域';
        console.log('使用默认领域:', domainName);
        this.addNoteToDomain(domainName, title, url);
    }

    showSelectDomainDialog(domains, title, url) {
        // 直接使用fallback，避免消息传递问题
        this.showFallbackDialog(domains, title, url);
    }

    showFallbackDialog(domains, title, url) {
        try {
            // 尝试通过popup显示选择对话框
            if (domains.length > 0) {
                // 发送消息到popup，让用户选择领域
                chrome.runtime.sendMessage({
                    action: 'showDomainSelector',
                    data: { domains, title, url }
                }, (response) => {
                    // 处理响应或错误
                    if (chrome.runtime.lastError) {
                        console.log('发送消息到popup失败:', chrome.runtime.lastError.message);
                        // 如果popup不可用，直接添加到第一个领域
                        this.addNoteToFirstDomain(domains, title, url).catch(error => {
                            console.error('添加到第一个领域失败:', error);
                        });
                    }
                });
            } else {
                console.log('没有可用的领域');
            }
        } catch (error) {
            console.error('显示fallback对话框时出错:', error);
            // 出错时直接添加到第一个领域
            if (domains.length > 0) {
                this.addNoteToFirstDomain(domains, title, url).catch(error => {
                    console.error('添加到第一个领域失败:', error);
                });
            }
        }
    }

    async addNoteToFirstDomain(domains, title, url) {
        try {
            if (domains.length > 0) {
                const firstDomain = domains[0];
                await this.addNoteToDomain(firstDomain, title, url);
            }
        } catch (error) {
            console.error('添加到第一个领域失败:', error);
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
            try {
                this.showNotification('笔记添加成功！', `已添加到领域: ${domainName}`);
            } catch (notificationError) {
                console.log('显示成功通知失败:', notificationError);
            }
        } catch (error) {
            console.error('添加笔记失败:', error);
            try {
                this.showNotification('添加失败', '请重试');
            } catch (notificationError) {
                console.log('显示错误通知失败:', notificationError);
            }
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
            const { title, siteName, url } = data;
            
            console.log('收到添加笔记请求:', { title, siteName, url });
            
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
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('发送通知消息失败:', chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.log('无法发送通知消息:', error);
        }
    }
}

// 初始化background script
const backgroundScript = new BackgroundScript();
