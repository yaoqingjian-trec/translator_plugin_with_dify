// Popup脚本
class PopupManager {
  constructor() {
    this.currentTab = null;
    this.settings = null;
    this.isTranslating = false;
    
    // 消息类型常量
    this.MESSAGE_TYPES = {
      PING: 'ping',
      TOGGLE_SELECTOR: 'toggle_selector',
      GET_STATUS: 'get_status',
      TRANSLATE_TEXT: 'translate_text',
      GET_SETTINGS: 'get_settings',
      UPDATE_SETTINGS: 'update_settings',
      CLEAR_CACHE: 'clear_cache',
      ELEMENT_SELECTED: 'element_selected',
      TRANSLATION_COMPLETE: 'translation_complete',
      TRANSLATION_ERROR: 'translation_error'
    };
    
    this.init();
  }

  // 初始化
  async init() {
    try {
      // 获取当前标签页
      this.currentTab = await this.getCurrentTab();
      
      // 检查标签页有效性
      if (!this.currentTab || !this.currentTab.id) {
        throw new Error('无效的标签页');
      }
      
      // 加载设置
      await this.loadSettings();
      
      // 绑定事件
      this.bindEvents();
      
      // 监听来自content script的消息
      this.setupMessageListener();
      
      // 检查是否有最近选择的元素
      await this.checkRecentSelection();
      
      // 更新UI
      this.updateUI();
      
      // 获取状态
      this.updateStatus();
      
      // 更新统计信息
      this.updateStats();
      
    } catch (error) {
      console.error('Popup初始化失败:', error);
      this.showError(`初始化失败: ${error.message}`);
    }
  }

  // 获取当前标签页
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('未找到活动标签页');
      }
      return tab;
    } catch (error) {
      console.error('获取标签页失败:', error);
      throw error;
    }
  }

  // 加载设置
  async loadSettings() {
    try {
      // 从存储中加载设置
      const result = await chrome.storage.sync.get('translator_settings');
      this.settings = result.translator_settings || {
        primaryApi: 'siliconflow',
        targetLanguage: 'zh-CN',
        enableShortcut: true,
        enableContextMenu: true,
        cacheResults: true
      };
    } catch (error) {
      console.error('加载设置失败:', error);
      // 使用默认设置
      this.settings = {
        primaryApi: 'siliconflow',
        targetLanguage: 'zh-CN',
        enableShortcut: true,
        enableContextMenu: true,
        cacheResults: true
      };
    }
  }

  // 绑定事件
  bindEvents() {
    // 切换选择器
    document.getElementById('toggleSelector').addEventListener('click', () => {
      this.toggleSelector();
    });
    
    // 快速翻译按钮
    document.getElementById('translateBtn').addEventListener('click', () => {
      this.translateQuickText();
    });
    
    // 清空输入按钮
    document.getElementById('clearInput').addEventListener('click', () => {
      this.clearInput();
    });
    
    // 语言选择
    document.getElementById('targetLanguage').addEventListener('change', (e) => {
      this.updateLanguageSetting('targetLanguage', e.target.value);
    });
    
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });
    
    // 清空缓存按钮
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
      this.clearCache();
    });
    
    // 绑定流式翻译消息监听
    this.bindStreamingEvents();
  }

  // 绑定流式翻译消息监听
  bindStreamingEvents() {
    // 监听来自background的流式数据
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'POPUP_TRANSLATION_PROGRESS') {
        this.handleStreamingProgress(message.data);
      }
    });
  }

  // 处理流式翻译进度
  handleStreamingProgress(data) {
    console.log('Popup收到流式翻译进度:', data);
    
    const resultDiv = document.getElementById('translationResult');
    if (resultDiv) {
      this.updateStreamingResult(data);
    }
  }

  // 更新流式翻译结果
  updateStreamingResult(data) {
    const resultDiv = document.getElementById('translationResult');
    if (!resultDiv) return;
    
    const { originalText, partialText, isComplete } = data;
    
    resultDiv.innerHTML = `
      <div class="translation-item">
        <div class="translation-header">
          <span class="status-indicator ${isComplete ? 'complete' : 'streaming'}">
            ${isComplete ? '✅' : '🔄'} ${isComplete ? '翻译完成' : '正在翻译'}
          </span>
          <span class="translation-info">
            自动检测 → ${data.targetLanguage}
          </span>
        </div>
        <div class="translation-content">
          <div class="original-text">
            <strong>原文:</strong> ${originalText}
          </div>
          <div class="translated-text">
            <strong>译文:</strong> 
            <span class="streaming-text">${partialText}${!isComplete ? '<span class="typing-cursor">|</span>' : ''}</span>
          </div>
        </div>
        ${isComplete ? `
          <div class="translation-actions">
            <button class="action-btn copy-btn" onclick="navigator.clipboard.writeText('${partialText.replace(/'/g, '\\\'')}')" 
                    title="复制译文">
              📋 复制
            </button>
            <button class="action-btn apply-btn" onclick="this.applyTranslation('${partialText.replace(/'/g, '\\\'')}')" 
                    title="应用到输入框">
              📝 应用
            </button>
          </div>
        ` : ''}
      </div>
    `;
    
    // 如果翻译完成，更新状态
    if (isComplete) {
      this.isTranslating = false;
      this.showLoading(false);
    }
    
    // 添加CSS动画
    if (!document.querySelector('#popup-streaming-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-streaming-styles';
      style.textContent = `
        .streaming-text {
          position: relative;
        }
        
        .typing-cursor {
          animation: blink 1s infinite;
          color: #007bff;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .status-indicator.streaming {
          color: #007bff;
          animation: pulse 1.5s infinite;
        }
        
        .status-indicator.complete {
          color: #28a745;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // 设置消息监听器
  setupMessageListener() {
    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
  }

  // 处理消息
  handleMessage(request, sender, sendResponse) {
    switch (request.type) {
      case this.MESSAGE_TYPES.ELEMENT_SELECTED:
        // 检查是否包含翻译结果
        if (request.data.translatedText || request.data.error) {
          this.handleElementSelectedWithTranslation(request.data);
        } else {
          this.handleElementSelected(request.data);
        }
        break;
        
      case this.MESSAGE_TYPES.TRANSLATION_COMPLETE:
        console.log('收到翻译完成消息:', request.data);
        this.handleTranslationComplete(request.data);
        break;
        
      case this.MESSAGE_TYPES.TRANSLATION_ERROR:
        console.log('收到翻译错误消息:', request.data);
        this.handleTranslationError(request.data);
        break;
        
      default:
        console.log('未知消息类型:', request.type);
    }
  }

  // 检查最近的元素选择
  async checkRecentSelection() {
    try {
      const result = await chrome.storage.local.get('translator_selected_element');
      const selectedData = result.translator_selected_element;
      
      if (selectedData && selectedData.timestamp) {
        // 检查是否是最近10分钟内的选择（避免显示过期的选择）
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        if (selectedData.timestamp > tenMinutesAgo) {
          console.log('发现最近的元素选择:', selectedData);
          this.handleElementSelectedWithTranslation(selectedData, true);
        } else {
          // 清理过期的数据
          chrome.storage.local.remove('translator_selected_element');
        }
      }
    } catch (error) {
      console.error('检查最近选择失败:', error);
    }
  }

  // 处理带翻译结果的元素选择
  handleElementSelectedWithTranslation(data, isFromStorage = false) {
    console.log('元素已选择（含翻译结果）:', data);
    
    // 更新快速翻译输入框
    const input = document.getElementById('quickTranslateInput');
    if (input) {
      // 使用originalText或text字段
      const textToShow = data.originalText || data.text;
      input.value = textToShow;
      if (!isFromStorage) {
        input.focus();
      }
    }
    
    // 如果正在翻译，显示翻译中状态
    if (data.isTranslating) {
      this.showTranslatingStatus(data.originalText || data.text);
      
      const message = isFromStorage 
        ? `恢复选择（翻译中）: ${(data.originalText || data.text).substring(0, 30)}${(data.originalText || data.text).length > 30 ? '...' : ''}` 
        : `已选择文本，正在翻译: ${(data.originalText || data.text).substring(0, 30)}${(data.originalText || data.text).length > 30 ? '...' : ''}`;
      this.showInfo(message);
    }
    // 如果有翻译结果，显示翻译结果
    else if (data.translatedText) {
      this.showTranslationResult({
        originalText: data.originalText || data.text,
        translatedText: data.translatedText,
        targetLanguage: data.targetLanguage
      });
      
      // 显示成功消息
      const message = isFromStorage 
        ? `恢复翻译结果: ${(data.originalText || data.text).substring(0, 30)}${(data.originalText || data.text).length > 30 ? '...' : ''}` 
        : `翻译完成: ${(data.originalText || data.text).substring(0, 30)}${(data.originalText || data.text).length > 30 ? '...' : ''}`;
      this.showSuccess(message);
    } else if (data.error) {
      // 如果有错误信息，显示错误
      this.showTranslationError(data.error);
      
      const message = isFromStorage 
        ? `恢复选择（翻译失败）: ${(data.originalText || data.text).substring(0, 30)}...` 
        : `选择完成（翻译失败）: ${(data.originalText || data.text).substring(0, 30)}...`;
      this.showError(message);
    } else {
      // 只有原文，没有翻译结果
      this.handleElementSelected(data, isFromStorage);
      return;
    }
    
    // 更新选择器按钮状态
    this.updateSelectorButton(false);
    
    // 如果是从storage恢复的，清理storage数据（避免重复显示）
    if (isFromStorage) {
      chrome.storage.local.remove('translator_selected_element');
    }
  }

  // 处理翻译完成
  handleTranslationComplete(data) {
    console.log('处理翻译完成:', data);
    
    // 更新翻译结果显示
    this.showTranslationResult({
      originalText: data.originalText,
      translatedText: data.translatedText,
      targetLanguage: data.targetLanguage
    });
    
    // 显示成功消息
    this.showSuccess(`翻译完成！`);
  }

  // 处理翻译错误
  handleTranslationError(data) {
    console.log('处理翻译错误:', data);
    
    // 显示错误信息
    this.showTranslationError(data.error);
    
    // 显示错误消息
    this.showError(`翻译失败: ${data.error}`);
  }

  // 显示翻译中状态
  showTranslatingStatus(originalText) {
    const resultDiv = document.getElementById('translationResult');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="translation-text">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <div class="loading-text">正在翻译 "${originalText.substring(0, 50)}${originalText.length > 50 ? '...' : ''}"</div>
          </div>
        </div>
      `;
    }
  }

  // 显示信息消息
  showInfo(message) {
    this.showMessage(message, 'info');
  }

  // 处理元素选择（兼容旧版本）
  handleElementSelected(data, isFromStorage = false) {
    console.log('元素已选择:', data);
    
    // 更新快速翻译输入框
    const input = document.getElementById('quickTranslateInput');
    if (input) {
      const textToShow = data.originalText || data.text;
      input.value = textToShow;
      if (!isFromStorage) {
        input.focus();
      }
    }
    
    // 显示成功消息
    const message = isFromStorage 
      ? `恢复选择的文本: ${(data.originalText || data.text).substring(0, 50)}${(data.originalText || data.text).length > 50 ? '...' : ''}` 
      : `已选择文本: ${(data.originalText || data.text).substring(0, 50)}${(data.originalText || data.text).length > 50 ? '...' : ''}`;
    this.showSuccess(message);
    
    // 更新选择器按钮状态
    this.updateSelectorButton(false);
    
    // 如果是从storage恢复的，清理storage数据（避免重复显示）
    if (isFromStorage) {
      chrome.storage.local.remove('translator_selected_element');
    }
  }

  // 更新UI
  updateUI() {
    // 更新语言选择器
    document.getElementById('targetLanguage').value = this.settings.targetLanguage;
    
    // 更新按钮状态
    this.updateButtonStates();
    
    // 检查API配置
    this.checkApiConfiguration();
  }

  // 更新按钮状态
  updateButtonStates() {
    const currentUrl = this.currentTab?.url || '';
    const isValidUrl = this.isValidUrl(currentUrl);
    
    // 更新选择器按钮状态
    const toggleButton = document.getElementById('toggleSelector');
    toggleButton.disabled = !isValidUrl;
    
    if (!isValidUrl) {
      toggleButton.title = '当前页面不支持选择器功能';
    } else {
      toggleButton.title = '启动元素选择器';
    }
  }

  // 显示加载状态
  showLoading(show) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.disabled = show;
    });
    
    if (show) {
      document.getElementById('toggleSelector').disabled = true;
    } else {
      document.getElementById('toggleSelector').disabled = false;
    }
  }

  // 切换选择器
  async toggleSelector() {
    if (!this.currentTab) {
      this.showError('未找到当前标签页');
      return;
    }

    // 检查页面URL是否支持
    if (!this.isValidUrl(this.currentTab.url)) {
      this.showError('当前页面不支持选择器功能（请在http或https页面使用）');
      return;
    }

    try {
      this.showLoading(true);
      
      // 首先检查内容脚本是否已加载
      let scriptReady = false;
      try {
        const pingResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
          type: this.MESSAGE_TYPES.PING
        });
        
        if (pingResponse && pingResponse.success) {
          scriptReady = true;
          console.log('内容脚本已加载');
        }
      } catch (pingError) {
        console.log('内容脚本未响应，可能需要等待页面加载完成');
      }
      
      if (!scriptReady) {
        // 如果脚本没有响应，等待一段时间再重试
        console.log('等待页面和脚本加载...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 再次尝试联系内容脚本
        try {
          const retryResponse = await chrome.tabs.sendMessage(this.currentTab.id, {
            type: this.MESSAGE_TYPES.PING
          });
          
          if (retryResponse && retryResponse.success) {
            scriptReady = true;
            console.log('内容脚本现已准备就绪');
          }
        } catch (retryError) {
          throw new Error('内容脚本未正确加载，请刷新页面后重试');
        }
      }
      
      if (!scriptReady) {
        throw new Error('内容脚本未准备就绪，请刷新页面后重试');
      }
      
      // 发送切换选择器消息
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: this.MESSAGE_TYPES.TOGGLE_SELECTOR
      });
      
      if (response && response.success) {
        // 更新按钮状态
        this.updateSelectorButton();
        this.showSuccess('选择器已启动');
      } else {
        throw new Error(response?.error || '选择器启动失败');
      }
      
    } catch (error) {
      console.error('切换选择器失败:', error);
      this.showError(`切换选择器失败: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  // 检查URL是否有效
  isValidUrl(url) {
    if (!url) return false;
    
    // 排除特殊页面
    const invalidSchemes = ['chrome:', 'chrome-extension:', 'moz-extension:', 'about:', 'file:'];
    const invalidPages = ['chrome://newtab/', 'chrome://extensions/'];
    
    for (const scheme of invalidSchemes) {
      if (url.startsWith(scheme)) return false;
    }
    
    for (const page of invalidPages) {
      if (url.includes(page)) return false;
    }
    
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // 注入内容脚本
  async injectContentScript() {
    try {
      // 检查是否有必要的权限
      const hasPermission = await chrome.permissions.contains({
        permissions: ['scripting', 'tabs']
      });
      
      if (!hasPermission) {
        throw new Error('缺少必要的权限');
      }
      
      console.log('开始注入JavaScript文件...');
      
      // 逐个注入脚本文件，确保顺序正确
      const scriptFiles = [
        'utils/constants.js',
        'utils/storage.js',
        'content/ui-overlay.js',
        'content/element-selector.js',
        'content/translator.js',
        'content/content.js'
      ];
      
      for (const file of scriptFiles) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: this.currentTab.id },
            files: [file]
          });
          console.log(`成功注入: ${file}`);
        } catch (error) {
          console.error(`注入${file}失败:`, error);
          throw error;
        }
      }
      
      console.log('所有脚本注入完成');
      
    } catch (error) {
      console.error('注入脚本失败:', error);
      throw error;
    }
  }

  // 验证脚本是否已加载
  async validateScriptLoaded() {
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: this.MESSAGE_TYPES.PING
      });
      
      console.log('脚本验证响应:', response);
      
      if (response && response.success) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('脚本验证失败:', error);
      return false;
    }
  }

  // 清空缓存
  async clearCache() {
    try {
      this.showLoading(true);
      
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: this.MESSAGE_TYPES.CLEAR_CACHE
      });
      
      if (response && response.success) {
        this.showSuccess('缓存已清空');
        this.updateStats();
      } else {
        throw new Error(response?.error || '清空缓存失败');
      }
      
    } catch (error) {
      console.error('清空缓存失败:', error);
      this.showError(`清空缓存失败: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  }

  // 更新状态
  async updateStatus() {
    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        type: this.MESSAGE_TYPES.GET_STATUS
      });
      
      if (response && response.success) {
        this.displayStatus(response.data);
      } else {
        this.displayStatus({
          ready: false,
          error: response?.error || '获取状态失败'
        });
      }
      
    } catch (error) {
      console.error('获取状态失败:', error);
      this.displayStatus({
        ready: false,
        error: error.message
      });
    }
  }

  // 显示状态
  displayStatus(status) {
    const statusEl = document.getElementById('status');
    const readyEl = document.getElementById('ready');
    
    if (status.ready) {
      statusEl.textContent = '就绪';
      statusEl.className = 'status ready';
      readyEl.style.display = 'block';
    } else {
      statusEl.textContent = '未就绪';
      statusEl.className = 'status not-ready';
      readyEl.style.display = 'none';
    }
    
    // 更新详细信息
    const detailsEl = document.getElementById('statusDetails');
    if (status.error) {
      detailsEl.textContent = `错误: ${status.error}`;
      detailsEl.className = 'error';
    } else {
      detailsEl.textContent = status.ready ? '所有组件已加载' : '正在加载组件...';
      detailsEl.className = status.ready ? 'success' : 'warning';
    }
  }

  // 更新统计信息
  async updateStats() {
    try {
      // 获取存储统计信息
      const syncUsed = await chrome.storage.sync.getBytesInUse();
      const localUsed = await chrome.storage.local.getBytesInUse();
      
      // 更新显示
      document.getElementById('storageUsed').textContent = `${Math.round(syncUsed / 1024)}KB`;
      document.getElementById('cacheUsed').textContent = `${Math.round(localUsed / 1024)}KB`;
      
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }

  // 更新设置显示
  updateSettingsDisplay() {
    if (!this.settings) return;
    
    document.getElementById('currentApi').textContent = this.settings.primaryApi;
          document.getElementById('currentLang').textContent = `自动检测 → ${this.settings.targetLanguage}`;
  }

  // 更新选择器按钮状态
  updateSelectorButton(isActive = null) {
    const button = document.getElementById('toggleSelector');
    if (isActive !== null) {
      if (isActive) {
        button.classList.add('active');
        button.textContent = '关闭选择器';
      } else {
        button.classList.remove('active');
        button.textContent = '启动选择器';
      }
    } else {
      button.classList.toggle('active');
    }
  }

  // 检查API配置
  checkApiConfiguration() {
    // 这里可以添加API配置检查逻辑
    console.log('API配置检查:', this.settings);
  }

  // 翻译快速文本 - 流式版本
  async translateQuickText() {
    const input = document.getElementById('quickTranslateInput');
    const text = input.value.trim();

    if (!text) {
      this.showError('请输入要翻译的文本');
      return;
    }

    if (this.isTranslating) {
      return;
    }

    this.isTranslating = true;
    this.showLoading(true);

    try {
      // 显示初始翻译状态
      const resultDiv = document.getElementById('translationResult');
      resultDiv.innerHTML = `
        <div class="translation-item">
          <div class="translation-header">
            <span class="status-indicator streaming">
              🔄 准备翻译
            </span>
            <span class="translation-info">
              自动检测 → ${this.settings.targetLanguage}
            </span>
          </div>
          <div class="translation-content">
            <div class="original-text">
              <strong>原文:</strong> ${text}
            </div>
            <div class="translated-text">
              <strong>译文:</strong> 
              <span class="streaming-text">正在准备翻译...</span>
            </div>
          </div>
        </div>
      `;

      console.log('=== 开始流式翻译请求 ===');
      console.log('输入文本:', text);
      console.log('当前设置:', this.settings);
      
      // 检查API密钥设置
      const apiKeySet = this.settings.primaryApi === 'siliconflow' 
        ? this.settings.siliconflowApiKey 
        : this.settings.difyApiKey;
      console.log('API类型:', this.settings.primaryApi);
      console.log('API密钥是否已设置:', !!apiKeySet);

      // 发送翻译请求（流式）
      const requestData = {
        type: 'translate_text',
        data: {
          text: text,
          targetLanguage: this.settings.targetLanguage
        }
      };

      console.log('发送流式翻译请求:', requestData);

      // 异步发送请求，不等待完整响应，依赖流式数据更新界面
      chrome.runtime.sendMessage(requestData).then(response => {
        console.log('收到翻译响应:', response);
        
        if (!response || !response.success) {
          console.error('翻译失败，响应:', response);
          // 如果请求失败且没有收到流式数据，显示错误
          setTimeout(() => {
            if (this.isTranslating) {
              this.showTranslationError(response?.error || '翻译失败');
            }
          }, 5000);
        }
      }).catch(error => {
        console.error('发送翻译请求失败:', error);
        this.showTranslationError(error.message);
      });

    } catch (error) {
      console.error('翻译失败:', error);
      this.showTranslationError(error.message);
    }
  }

  // 显示翻译结果
  showTranslationResult(result) {
    const resultDiv = document.getElementById('translationResult');
    resultDiv.innerHTML = `
      <div class="translation-text">
        <div class="translation-content">${result.translatedText}</div>
        <div class="translation-actions">
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${result.translatedText}')">
            复制
          </button>
          <span class="translation-info">
                            自动检测 → ${result.targetLanguage}
          </span>
        </div>
      </div>
    `;
  }

  // 显示翻译错误
  showTranslationError(error) {
    const resultDiv = document.getElementById('translationResult');
    resultDiv.innerHTML = `
      <div class="translation-text error">
        <div class="error-message">翻译失败: ${error}</div>
        <button class="copy-btn" onclick="document.querySelector('.popup-container').popupManager.translateQuickText()">
          重试
        </button>
      </div>
    `;
  }

  // 清空输入
  clearInput() {
    document.getElementById('quickTranslateInput').value = '';
    document.getElementById('translationResult').innerHTML = `
      <div class="result-placeholder">
        翻译结果将显示在这里...
      </div>
    `;
  }

  // 更新语言设置
  async updateLanguageSetting(key, value) {
    try {
      this.settings[key] = value;
      await chrome.storage.sync.set({ translator_settings: this.settings });
      this.showSuccess('语言设置已更新');
    } catch (error) {
      console.error('更新语言设置失败:', error);
      this.showError('更新设置失败');
    }
  }

  // 打开设置页面
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // 切换主题
  toggleTheme() {
    document.body.classList.toggle('dark-theme');
  }

  // 打开帮助
  openHelp() {
    chrome.tabs.create({
      url: 'https://github.com/yourusername/translator-extension'
    });
  }

  // 显示错误消息
  showError(message) {
    this.showMessage(message, 'error');
  }

  // 显示成功消息
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  // 显示消息
  showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // 自动隐藏消息
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 