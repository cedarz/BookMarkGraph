// 笔记管理器主逻辑
class NotesManager {
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
        
        this.domains[domainName].push({
            title: title || url,
            url: url,
            timestamp: Date.now()
        });
        
        await this.saveData();
        this.renderDomains();
    }

    renderDomains() {
        const container = document.getElementById('domainsContainer');
        
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
                <div class="note-content">
                    <a href="${note.url}" target="_blank" class="note-link">
                        ${note.title}
                    </a>
                </div>
                <div class="note-actions">
                    <button class="btn btn-danger delete-note-btn" data-domain="${domainName}" data-note-index="${index}">
                        删除
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="domain-card" data-domain="${domainName}">
                <div class="domain-header">
                    <div class="domain-name">${domainName}</div>
                    <div class="domain-actions">
                        <button class="btn btn-primary add-note-btn" data-domain="${domainName}">
                            + 添加笔记
                        </button>
                        <button class="btn btn-danger delete-domain-btn" data-domain="${domainName}">
                            删除领域
                        </button>
                    </div>
                </div>
                <div class="notes-list">
                    ${notes.length > 0 ? notesHtml : '<p class="empty-notes">暂无笔记</p>'}
                </div>
            </div>
        `;
    }

    bindDomainEvents() {
        // 事件委托处理动态生成的按钮
        document.addEventListener('click', (e) => {
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
            // 处理删除领域按钮
            else if (e.target.classList.contains('delete-domain-btn')) {
                const domainName = e.target.dataset.domain;
                this.deleteDomain(domainName);
            }
        });
    }

    showAddNoteForm(domainName) {
        const title = prompt('请输入笔记标题（可选）:');
        const url = prompt('请输入链接地址:');
        
        if (url) {
            this.addNote(domainName, title, url);
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
        
        // 重新渲染界面
        this.renderDomains();
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
}

// 初始化笔记管理器
const notesManager = new NotesManager();
