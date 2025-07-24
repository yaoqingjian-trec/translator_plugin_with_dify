// 设置页面脚本
class OptionsManager {
  constructor() {
    this.settings = {};
    this.currentTab = 'general';
    this.hasChanges = false;
    
    this.init();
  }

  // 初始化
  async init() {
    try {
      // 加载设置
      await this.loadSettings();
      
      // 绑定事件
      this.bindEvents();
      
      // 更新UI
      this.updateUI();
      
      // 检查是否是欢迎页面
      this.checkWelcomeMode();
      
    } catch (error) {
      console.error('设置页面初始化失败:', error);
      this.showError('初始化失败');
    }
  }

  // 加载设置
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('translator_settings');
      this.settings = {
        ...this.getDefaultSettings(),
        ...result.translator_settings
      };
    } catch (error) {
      console.error('加载设置失败:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  // 获取默认设置
  getDefaultSettings() {
    return {
      primaryApi: 'siliconflow',
      siliconflowApiKey: '',
      siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct',
      difyApiKey: '',
      difyBaseUrl: 'https://api.dify.ai/v1',
  
      targetLanguage: 'zh-CN',
      enableShortcut: true,
      enableContextMenu: true,
      enableAutoTranslate: false,
      cacheResults: true,
      showTooltip: true,
      tooltipPosition: 'auto',
      highlightColor: '#007bff',
      animationSpeed: 'normal',
      minTextLength: 2,
      maxTextLength: 5000,
      requestTimeout: 30,
      excludeElements: ['script', 'style', 'noscript', 'meta', 'link'],
      debugMode: false
    };
  }

  // 绑定事件
  bindEvents() {
    // 标签页切换
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // 表单控件事件
    this.bindFormEvents();

    // 按钮事件
    this.bindButtonEvents();

    // 页面离开确认
    window.addEventListener('beforeunload', (e) => {
      if (this.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // 绑定表单事件
  bindFormEvents() {
    const formElements = document.querySelectorAll('input, select, textarea');
    formElements.forEach(element => {
      element.addEventListener('change', () => {
        this.hasChanges = true;
        this.updateSaveButton();
      });
    });

    // 密码显示/隐藏
    document.getElementById('toggleSiliconflowKey').addEventListener('click', () => {
      this.togglePasswordVisibility('siliconflowApiKey');
    });

    document.getElementById('toggleDifyKey').addEventListener('click', () => {
      this.togglePasswordVisibility('difyApiKey');
    });

    // 颜色选择器
    document.getElementById('highlightColor').addEventListener('input', (e) => {
      this.updateColorPreview(e.target.value);
    });
  }

  // 绑定按钮事件
  bindButtonEvents() {
    // 保存设置
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // 取消设置
    document.getElementById('cancelSettings').addEventListener('click', () => {
      this.cancelSettings();
    });

    // 导出设置
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportSettings();
    });

    // 导入设置
    document.getElementById('importBtn').addEventListener('click', () => {
      this.importSettings();
    });

    // 测试API
    document.getElementById('testSiliconflowApi').addEventListener('click', () => {
      this.testApi('siliconflow');
    });

    document.getElementById('testDifyApi').addEventListener('click', () => {
      this.testApi('dify');
    });

    // 清空所有数据
    document.getElementById('clearAllData').addEventListener('click', () => {
      this.clearAllData();
    });

    // 重置设置
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // 文件输入
    document.getElementById('importFileInput').addEventListener('change', (e) => {
      this.handleImportFile(e.target.files[0]);
    });
  }

  // 切换标签页
  switchTab(tabId) {
    // 更新导航
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    // 更新内容
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    this.currentTab = tabId;
  }

  // 更新UI
  updateUI() {
    // 通用设置
    document.getElementById('primaryApi').value = this.settings.primaryApi;

    document.getElementById('targetLanguage').value = this.settings.targetLanguage;
    document.getElementById('enableShortcut').checked = this.settings.enableShortcut;
    document.getElementById('enableContextMenu').checked = this.settings.enableContextMenu;
    document.getElementById('enableAutoTranslate').checked = this.settings.enableAutoTranslate;
    document.getElementById('cacheResults').checked = this.settings.cacheResults;

    // API设置
    document.getElementById('siliconflowApiKey').value = this.settings.siliconflowApiKey;
    document.getElementById('siliconflowModel').value = this.settings.siliconflowModel;
    document.getElementById('difyApiKey').value = this.settings.difyApiKey;
    document.getElementById('difyBaseUrl').value = this.settings.difyBaseUrl;

    // 界面设置
    document.getElementById('showTooltip').checked = this.settings.showTooltip;
    document.getElementById('tooltipPosition').value = this.settings.tooltipPosition;
    document.getElementById('highlightColor').value = this.settings.highlightColor;
    document.getElementById('animationSpeed').value = this.settings.animationSpeed;
    this.updateColorPreview(this.settings.highlightColor);

    // 高级设置
    document.getElementById('minTextLength').value = this.settings.minTextLength;
    document.getElementById('maxTextLength').value = this.settings.maxTextLength;
    document.getElementById('requestTimeout').value = this.settings.requestTimeout;
    document.getElementById('excludeElements').value = this.settings.excludeElements.join(',');
    document.getElementById('debugMode').checked = this.settings.debugMode;
  }

  // 从UI收集设置
  collectSettings() {
    return {
      primaryApi: document.getElementById('primaryApi').value,
      siliconflowApiKey: document.getElementById('siliconflowApiKey').value,
      siliconflowModel: document.getElementById('siliconflowModel').value,
      difyApiKey: document.getElementById('difyApiKey').value,
      difyBaseUrl: document.getElementById('difyBaseUrl').value,

      targetLanguage: document.getElementById('targetLanguage').value,
      enableShortcut: document.getElementById('enableShortcut').checked,
      enableContextMenu: document.getElementById('enableContextMenu').checked,
      enableAutoTranslate: document.getElementById('enableAutoTranslate').checked,
      cacheResults: document.getElementById('cacheResults').checked,
      showTooltip: document.getElementById('showTooltip').checked,
      tooltipPosition: document.getElementById('tooltipPosition').value,
      highlightColor: document.getElementById('highlightColor').value,
      animationSpeed: document.getElementById('animationSpeed').value,
      minTextLength: parseInt(document.getElementById('minTextLength').value),
      maxTextLength: parseInt(document.getElementById('maxTextLength').value),
      requestTimeout: parseInt(document.getElementById('requestTimeout').value),
      excludeElements: document.getElementById('excludeElements').value.split(',').map(s => s.trim()),
      debugMode: document.getElementById('debugMode').checked
    };
  }

  // 保存设置
  async saveSettings() {
    try {
      this.showLoading(true);
      
      const newSettings = this.collectSettings();
      
      // 验证设置
      if (!this.validateSettings(newSettings)) {
        return;
      }

      // 保存到存储
      await chrome.storage.sync.set({ translator_settings: newSettings });
      
      this.settings = newSettings;
      this.hasChanges = false;
      this.updateSaveButton();
      
      this.showSuccess('设置已保存');
      
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showError('保存设置失败');
    } finally {
      this.showLoading(false);
    }
  }

  // 取消设置
  cancelSettings() {
    if (this.hasChanges) {
      if (confirm('您有未保存的更改，确定要取消吗？')) {
        this.updateUI();
        this.hasChanges = false;
        this.updateSaveButton();
      }
    }
  }

  // 验证设置
  validateSettings(settings) {
    // 检查API密钥
    if (!settings.siliconflowApiKey && !settings.difyApiKey) {
      this.showError('请至少配置一个API密钥');
      this.switchTab('api');
      return false;
    }

    // 检查数值范围
    if (settings.minTextLength < 1 || settings.minTextLength > 100) {
      this.showError('最小文本长度必须在1-100之间');
      this.switchTab('advanced');
      return false;
    }

    if (settings.maxTextLength < 100 || settings.maxTextLength > 10000) {
      this.showError('最大文本长度必须在100-10000之间');
      this.switchTab('advanced');
      return false;
    }

    if (settings.requestTimeout < 5 || settings.requestTimeout > 60) {
      this.showError('请求超时时间必须在5-60秒之间');
      this.switchTab('advanced');
      return false;
    }

    // 检查URL格式
    if (settings.difyBaseUrl && !this.isValidUrl(settings.difyBaseUrl)) {
      this.showError('Dify基础URL格式不正确');
      this.switchTab('api');
      return false;
    }

    return true;
  }

  // 验证URL格式
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // 测试API
  async testApi(apiType) {
    try {
      const button = document.getElementById(`test${apiType.charAt(0).toUpperCase() + apiType.slice(1)}Api`);
      const status = document.getElementById(`${apiType}Status`);
      
      button.disabled = true;
      status.className = 'api-status loading';
      status.textContent = '测试中...';
      
      const apiKey = document.getElementById(`${apiType}ApiKey`).value;
      if (!apiKey) {
        throw new Error('请先输入API密钥');
      }

      const baseUrl = apiType === 'dify' ? document.getElementById('difyBaseUrl').value : null;
      
      // 获取用户当前选择的模型（如果是硅基流动API）
      const selectedModel = apiType === 'siliconflow' ? document.getElementById('siliconflowModel').value : null;
      
      const response = await chrome.runtime.sendMessage({
        type: 'test_api',
        data: {
          apiType,
          apiKey,
          baseUrl,
          selectedModel
        }
      });

      if (response.success && response.data.success) {
        status.className = 'api-status success';
        status.textContent = '✓ ' + response.data.message;
      } else {
        status.className = 'api-status error';
        status.textContent = '✗ ' + (response.data.error || '测试失败');
      }

    } catch (error) {
      const status = document.getElementById(`${apiType}Status`);
      status.className = 'api-status error';
      status.textContent = '✗ ' + error.message;
    } finally {
      const button = document.getElementById(`test${apiType.charAt(0).toUpperCase() + apiType.slice(1)}Api`);
      button.disabled = false;
    }
  }

  // 切换密码可见性
  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(`toggle${inputId.charAt(0).toUpperCase() + inputId.slice(1).replace('ApiKey', 'Key')}`);
    
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
        </svg>
      `;
    } else {
      input.type = 'password';
      button.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      `;
    }
  }

  // 更新颜色预览
  updateColorPreview(color) {
    const preview = document.getElementById('colorPreview');
    preview.style.setProperty('--color', color);
  }

  // 导出设置
  async exportSettings() {
    try {
      const settings = this.collectSettings();
      const data = {
        version: '1.0.0',
        timestamp: Date.now(),
        settings
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `translator-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showSuccess('设置已导出');
      
    } catch (error) {
      console.error('导出设置失败:', error);
      this.showError('导出设置失败');
    }
  }

  // 导入设置
  importSettings() {
    document.getElementById('importFileInput').click();
  }

  // 处理导入文件
  async handleImportFile(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.settings) {
        this.settings = { ...this.getDefaultSettings(), ...data.settings };
        this.updateUI();
        this.hasChanges = true;
        this.updateSaveButton();
        this.showSuccess('设置已导入，请点击保存');
      } else {
        throw new Error('无效的设置文件格式');
      }
      
    } catch (error) {
      console.error('导入设置失败:', error);
      this.showError('导入设置失败: ' + error.message);
    }
  }

  // 清空所有数据
  async clearAllData() {
    if (confirm('确定要清空所有数据吗？这将删除所有设置和缓存数据，且无法恢复。')) {
      try {
        this.showLoading(true);
        
        await chrome.storage.sync.clear();
        await chrome.storage.local.clear();
        
        this.settings = this.getDefaultSettings();
        this.updateUI();
        this.hasChanges = false;
        this.updateSaveButton();
        
        this.showSuccess('所有数据已清空');
        
      } catch (error) {
        console.error('清空数据失败:', error);
        this.showError('清空数据失败');
      } finally {
        this.showLoading(false);
      }
    }
  }

  // 重置设置
  async resetSettings() {
    if (confirm('确定要重置所有设置为默认值吗？')) {
      this.settings = this.getDefaultSettings();
      this.updateUI();
      this.hasChanges = true;
      this.updateSaveButton();
      this.showSuccess('设置已重置为默认值，请点击保存');
    }
  }

  // 更新保存按钮状态
  updateSaveButton() {
    const saveButton = document.getElementById('saveSettings');
    const cancelButton = document.getElementById('cancelSettings');
    
    if (this.hasChanges) {
      saveButton.disabled = false;
      cancelButton.disabled = false;
      saveButton.textContent = '保存设置 *';
    } else {
      saveButton.disabled = true;
      cancelButton.disabled = true;
      saveButton.textContent = '保存设置';
    }
  }

  // 检查欢迎模式
  checkWelcomeMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === 'true') {
      this.showWelcomeMessage();
    }
  }

  // 显示欢迎消息
  showWelcomeMessage() {
    this.showSuccess('欢迎使用智能翻译选择器！请配置您的API密钥以开始使用。');
    this.switchTab('api');
  }

  // 显示加载状态
  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
  }

  // 显示成功消息
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  // 显示错误消息
  showError(message) {
    this.showToast(message, 'error');
  }

  // 显示警告消息
  showWarning(message) {
    this.showToast(message, 'warning');
  }

  // 显示提示消息
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// 初始化设置页面
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
}); 