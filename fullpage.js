// 完整页面笔记管理器
class FullPageNotesManager {
    constructor() {
        this.domains = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.renderDomains();
    }

    async loadData() {
        try {
            const result = await chrome.storage.local.get(['notesData']);
            this.domains = result.notesData || {};
        } catch (error) {
            console.error('加载数据失败:', error);
            this.domains = {};
        }
    }

    async saveData() {
        try {
            await chrome.storage.local.set({ notesData: this.domains });
        } catch (error) {
            console.error('保存数据失败:', error);
        }
    }

    bindEvents() {
        // 添加领域按钮
        document.getElementById('addDomain').addEventListener('click', () => {
            this.showAddDomainForm();
        });

        // 保存领域
        document.getElementById('saveDomain').addEventListener('click', () => {
            this.saveDomain();
        });

        // 取消添加领域
        document.getElementById('cancelDomain').addEventListener('click', () => {
            this.hideAddDomainForm();
        });

        // 调试功能
        document.getElementById('testAddNote').addEventListener('click', () => {
            this.testAddNote();
        });

        document.getElementById('testStorage').addEventListener('click', () => {
            this.testStorage();
        });

        // 导出导入功能
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importData').addEventListener('click', () => {
            this.importData();
        });
    }

    showAddDomainForm() {
        document.getElementById('addDomainForm').style.display = 'block';
        document.getElementById('domainName').focus();
    }

    hideAddDomainForm() {
        document.getElementById('addDomainForm').style.display = 'none';
        document.getElementById('domainName').value = '';
    }

    async saveDomain() {
        const domainName = document.getElementById('domainName').value.trim();
        if (!domainName) {
            alert('请输入领域名称');
            return;
        }

        if (this.domains[domainName]) {
            alert('该领域已存在');
            return;
        }

        this.domains[domainName] = [];
        await this.saveData();
        this.hideAddDomainForm();
        this.renderDomains();
    }

    async deleteDomain(domainName) {
        if (confirm(`确定要删除领域 "${domainName}" 及其所有笔记吗？`)) {
            delete this.domains[domainName];
            await this.saveData();
            this.renderDomains();
        }
    }

    async deleteNote(domainName, noteIndex) {
        if (confirm('确定要删除这条笔记吗？')) {
            this.domains[domainName].splice(noteIndex, 1);
            await this.saveData();
            this.renderDomains();
        }
    }

    async addNote(domainName, title, url) {
        if (!this.domains[domainName]) {
            this.domains[domainName] = [];
        }
        
        // 如果没有提供标题，使用网站名作为默认标题
        const defaultTitle = title || this.getDomainName(url);
        
        this.domains[domainName].push({
            title: defaultTitle,
            url: url,
            timestamp: Date.now()
        });
        
        await this.saveData();
        this.renderDomains();
    }

    renderDomains() {
        const container = document.getElementById('domainsContainer');
        const totalNotesElement = document.getElementById('totalNotes');
        const totalDomainsElement = document.getElementById('totalDomains');
        
        // 计算总笔记数和领域数
        let totalNotes = 0;
        for (const notes of Object.values(this.domains)) {
            totalNotes += notes.length;
        }
        const totalDomains = Object.keys(this.domains).length;
        
        // 更新统计信息
        totalNotesElement.textContent = `${totalNotes} 条笔记`;
        totalDomainsElement.textContent = `${totalDomains} 个领域`;
        
        if (Object.keys(this.domains).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>还没有任何笔记</h3>
                    <p>点击"添加领域"开始创建你的第一个笔记领域</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const [domainName, notes] of Object.entries(this.domains)) {
            html += this.renderDomainCard(domainName, notes);
        }
        
        container.innerHTML = html;
        this.bindDomainEvents();
    }

    renderDomainCard(domainName, notes) {
        const notesHtml = notes.map((note, index) => `
            <div class="note-item" data-domain="${domainName}" data-note-index="${index}">
                <div class="note-icon">${this.getFavicon(note.url)}</div>
                <div class="note-content">
                    <a href="${note.url}" target="_blank" class="note-link">
                        ${note.title}
                    </a>
                    <div class="note-domain">${this.getDomainName(note.url)}</div>
                </div>
                <button class="note-delete delete-note-btn" data-domain="${domainName}" data-note-index="${index}">×</button>
            </div>
        `).join('');

        return `
            <div class="domain-card" data-domain="${domainName}">
                <div class="domain-header">
                    <div class="domain-info">
                        <div class="domain-name">${domainName}</div>
                        <div class="domain-stats">${notes.length} 条笔记</div>
                    </div>
                    <div class="domain-actions">
                        <button class="text-btn add-note-btn" data-domain="${domainName}">
                            + 添加笔记
                        </button>
                        <button class="text-btn edit-domain-btn" data-domain="${domainName}">
                            修改名称
                        </button>
                        <button class="text-btn text-btn-danger delete-domain-btn" data-domain="${domainName}">
                            删除领域
                        </button>
                    </div>
                </div>
                <div class="notes-list">
                    ${notes.length > 0 ? notesHtml : '<div class="empty-state"><p>暂无笔记</p></div>'}
                </div>
            </div>
        `;
    }

    getFavicon(url) {
        try {
            const domain = new URL(url).hostname;
            const firstChar = domain.charAt(0).toUpperCase();
            return firstChar;
        } catch {
            return '📄';
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

    bindDomainEvents() {
        // 移除旧的事件监听器
        if (this.domainEventHandler) {
            document.removeEventListener('click', this.domainEventHandler);
        }
        
        // 创建新的事件处理器
        this.domainEventHandler = (e) => {
            // 处理删除笔记按钮
            if (e.target.classList.contains('delete-note-btn')) {
                const domainName = e.target.dataset.domain;
                const noteIndex = parseInt(e.target.dataset.noteIndex);
                this.deleteNote(domainName, noteIndex);
            }
            // 处理添加笔记按钮
            else if (e.target.classList.contains('add-note-btn')) {
                const domainName = e.target.dataset.domain;
                this.showAddNoteForm(domainName);
            }
            // 处理修改领域名按钮
            else if (e.target.classList.contains('edit-domain-btn')) {
                const domainName = e.target.dataset.domain;
                this.editDomainName(domainName);
            }
            // 处理删除领域按钮
            else if (e.target.classList.contains('delete-domain-btn')) {
                const domainName = e.target.dataset.domain;
                this.deleteDomain(domainName);
            }
        };
        
        // 添加新的事件监听器
        document.addEventListener('click', this.domainEventHandler);
    }

    showAddNoteForm(domainName) {
        const title = prompt('请输入笔记标题（可选）:');
        const url = prompt('请输入链接地址:');
        
        if (url) {
            this.addNote(domainName, title, url);
        }
    }

    editDomainName(oldDomainName) {
        const newDomainName = prompt('请输入新的领域名称:', oldDomainName);
        
        if (newDomainName && newDomainName.trim() && newDomainName !== oldDomainName) {
            // 检查新名称是否已存在
            if (this.domains[newDomainName]) {
                alert('该领域名称已存在，请选择其他名称');
                return;
            }
            
            // 重命名领域
            const notes = this.domains[oldDomainName];
            delete this.domains[oldDomainName];
            this.domains[newDomainName] = notes;
            
            // 保存数据并重新渲染
            this.saveData();
            this.renderDomains();
        }
    }

    // 调试功能
    testAddNote() {
        this.debugLog('开始测试添加笔记...');
        
        // 检查是否有领域
        if (Object.keys(this.domains).length === 0) {
            this.debugLog('没有领域，先创建一个测试领域');
            this.domains['测试领域'] = [];
            this.saveData();
        }
        
        // 添加测试笔记
        const testTitle = '测试笔记 ' + new Date().toLocaleTimeString();
        const testUrl = 'https://www.example.com/test-' + Date.now();
        
        this.debugLog('添加测试笔记: ' + testTitle);
        this.addNote('测试领域', testTitle, testUrl);
        this.debugLog('测试完成！');
    }

    testStorage() {
        this.debugLog('测试存储功能...');
        this.debugLog('当前领域数量: ' + Object.keys(this.domains).length);
        this.debugLog('领域列表: ' + Object.keys(this.domains).join(', '));
        
        for (const [domainName, notes] of Object.entries(this.domains)) {
            this.debugLog(`领域 "${domainName}" 有 ${notes.length} 条笔记`);
        }
    }

    debugLog(message) {
        const logDiv = document.getElementById('debugLog');
        logDiv.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
        logDiv.scrollTop = logDiv.scrollHeight;
        console.log(message);
    }

    // 导出数据
    exportData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            notesData: this.domains
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.debugLog('数据导出成功');
    }

    // 导入数据
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.notesData) {
                            this.domains = data.notesData;
                            this.saveData();
                            this.renderDomains();
                            this.debugLog('数据导入成功');
                        } else {
                            alert('无效的数据文件');
                        }
                    } catch (error) {
                        alert('文件解析失败: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

// 初始化完整页面笔记管理器
const fullPageNotesManager = new FullPageNotesManager();
