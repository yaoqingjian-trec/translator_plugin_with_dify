// API管理器
class ApiManager {
  constructor() {
    this.settings = null;
    this.requestQueue = [];
    this.rateLimiter = new Map();
  }

  // 初始化
  async init() {
    await this.loadSettings();
    this.setupRateLimiting();
  }

  // 加载设置
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('translator_settings');
      this.settings = result.translator_settings || this.getDefaultSettings();
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
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000
    };
  }

  // 设置速率限制
  setupRateLimiting() {
    // 硅基流动API限制：100请求/分钟
    this.rateLimiter.set('siliconflow', {
      maxRequests: 100,
      timeWindow: 60000, // 1分钟
      requests: []
    });

    // Dify API限制：60请求/分钟
    this.rateLimiter.set('dify', {
      maxRequests: 60,
      timeWindow: 60000, // 1分钟
      requests: []
    });
  }

  // 检查速率限制
  checkRateLimit(apiType) {
    const limiter = this.rateLimiter.get(apiType);
    if (!limiter) return true;

    const now = Date.now();
    const cutoff = now - limiter.timeWindow;
    
    // 清理过期的请求记录
    limiter.requests = limiter.requests.filter(timestamp => timestamp > cutoff);
    
    // 检查是否超过限制
    if (limiter.requests.length >= limiter.maxRequests) {
      return false;
    }
    
    // 记录当前请求
    limiter.requests.push(now);
    return true;
  }

  // 发送HTTP请求
  async makeRequest(url, options, customTimeout = null) {
    const controller = new AbortController();
    const timeout = customTimeout || this.settings?.timeout || 30000; // 默认30秒
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.log(`发送HTTP请求到: ${url}, 超时时间: ${timeout}ms`);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      console.log(`HTTP响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('HTTP请求成功完成');
      return data;
    } catch (error) {
      console.error('HTTP请求失败:', error);
      if (error.name === 'AbortError') {
        throw new Error(`请求超时 (${timeout}ms)`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 测试API连接
  async testApi(apiType, apiKey, baseUrl = null, selectedModel = null) {
    console.log(`开始测试 ${apiType} API，密钥: ${apiKey ? apiKey.substring(0, 8) + '...' : '空'}`);
    
    try {
      let result;
      const testTimeout = 20000; // 测试使用20秒超时，给网络更多时间
      
      // 简单的网络连接检查
      console.log('检查网络连接...');
      try {
        await fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD', 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        console.log('网络连接正常');
      } catch (networkError) {
        console.warn('网络连接检查失败:', networkError);
      }
      
      if (apiType === 'siliconflow') {
        // 使用传递的模型参数，如果没有则使用默认值
        const modelToUse = selectedModel || this.settings?.siliconflowModel || 'Qwen/Qwen2.5-7B-Instruct';
        console.log(`调用硅基流动API，使用模型: ${modelToUse}`);
        
        // 验证API密钥格式（硅基流动通常以sk-开头）
        if (!apiKey.startsWith('sk-')) {
          console.warn('硅基流动API密钥格式可能有误，通常以sk-开头');
        }
        
        const response = await this.makeRequest('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: 'user',
                content: '请回复"测试成功"'
              }
            ],
            temperature: 0.3,
            max_tokens: 100
          })
        }, testTimeout);
        
        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
          throw new Error('API响应格式错误');
        }
        
        result = response.choices[0].message.content;
        console.log('硅基流动API测试成功，响应:', result);
        
      } else if (apiType === 'dify') {
        console.log('调用Dify API...');
        const response = await this.makeRequest(`${baseUrl || this.settings?.difyBaseUrl || 'https://api.dify.ai/v1'}/chat-messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            inputs: {},
            query: '请回复"测试成功"',
            user: 'translator-plugin-test',
            response_mode: 'blocking'
          })
        }, testTimeout);
        
        if (!response.answer) {
          throw new Error('API响应格式错误');
        }
        
        result = response.answer;
        console.log('Dify API测试成功，响应:', result);
      }
      
      return {
        success: true,
        message: 'API测试成功',
        result: result
      };
      
    } catch (error) {
      console.error(`${apiType} API测试失败:`, error);
      
      let errorMessage = error.message;
      
      // 提供更具体的错误信息
      if (error.message.includes('请求超时')) {
        errorMessage = '网络请求超时，请检查网络连接或稍后重试';
      } else if (error.message.includes('HTTP 401')) {
        errorMessage = 'API密钥无效，请检查密钥是否正确';
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = 'API访问被拒绝，请检查权限或配额';
      } else if (error.message.includes('HTTP 429')) {
        errorMessage = 'API调用频率过高，请稍后重试';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'API服务器内部错误，请稍后重试';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '网络连接失败，请检查网络设置';
      }
      
      return {
        success: false,
        message: 'API测试失败',
        error: errorMessage
      };
    }
  }

  // 翻译文本 - 支持流式调用
  async translateText(text, targetLanguage = null, onProgress = null) {
    console.log('=== ApiManager.translateText 开始 ===');
    console.log('输入参数:', { text, targetLanguage, hasProgressCallback: !!onProgress });
    console.log('当前设置:', this.settings);
    
    const target = targetLanguage || this.settings.targetLanguage;

    console.log('目标语言设置:', { target });

    // 检查参数
    if (!text || !text.trim()) {
      throw new Error('文本不能为空');
    }

    // if (text.length > 5000) {
    //   throw new Error('文本过长，请缩短后重试');
    // }
    console.log('this.settings', this.settings);

    // 检查API密钥
    if (this.settings.primaryApi === 'siliconflow' && !this.settings.siliconflowApiKey) {
      throw new Error('硅基流动API密钥未设置，请在设置页面配置');
    }
    
    if (this.settings.primaryApi === 'dify' && !this.settings.difyApiKey) {
      throw new Error('Dify API密钥未设置，请在设置页面配置');
    }

    // 尝试翻译
    let result;
    try {
      // 尝试主要API
      console.log('使用主要API:', this.settings.primaryApi);
      if (this.settings.primaryApi === 'siliconflow') {
        result = await this.callSiliconFlowAPI(text, target, onProgress);
      } else {
        result = await this.callDifyAPI(text, target, onProgress);
      }
    } catch (error) {
      console.log('主要API调用失败，尝试备用API:', error);
      
      // 降级到备用API
      try {
        if (this.settings.primaryApi === 'siliconflow') {
          result = await this.callDifyAPI(text, target, onProgress);
        } else {
          result = await this.callSiliconFlowAPI(text, target, onProgress);
        }
      } catch (fallbackError) {
        console.error('备用API也失败:', fallbackError);
        throw new Error('所有翻译API都不可用: ' + fallbackError.message);
      }
    }

    return {
      originalText: text,
      translatedText: result,
      targetLanguage: target
    };
  }

  // 调用硅基流动API - 支持流式响应
  async callSiliconFlowAPI(text, targetLanguage, onProgress = null) {
    if (!this.settings.siliconflowApiKey) {
      throw new Error('硅基流动API密钥未设置');
    }

    // 检查速率限制
    if (!this.checkRateLimit('siliconflow')) {
      throw new Error('硅基流动API调用频率过高，请稍后再试');
    }

    const prompt = this.buildTranslationPrompt(text, targetLanguage);
    const selectedModel = this.settings?.siliconflowModel || 'Qwen/Qwen2.5-7B-Instruct';
    
    console.log(`使用硅基流动API流式翻译，模型: ${selectedModel}`);
    
    const requestData = {
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: true // 开启流式响应
    };

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.siliconflowApiKey}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`硅基流动API请求失败: ${response.status} ${errorText}`);
      }

      return await this.handleStreamResponse(response, onProgress);
    } catch (error) {
      console.error('硅基流动API流式调用失败:', error);
      throw error;
    }
  }

  // 调用Dify API - 支持流式响应
  async callDifyAPI(text, targetLanguage, onProgress = null) {
    if (!this.settings.difyApiKey) {
      throw new Error('Dify API密钥未设置');
    }

    // 检查速率限制
    if (!this.checkRateLimit('dify')) {
      throw new Error('Dify API调用频率过高，请稍后再试');
    }

    const prompt = this.buildTranslationPrompt(text, targetLanguage);
    
    const requestData = {
      inputs: {},
      query: prompt,
      user: 'translator-plugin-' + Date.now(),
      response_mode: 'streaming' // 使用流式模式
    };

    try {
      const response = await fetch(`${this.settings.difyBaseUrl}/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.difyApiKey}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API请求失败: ${response.status} ${errorText}`);
      }

      return await this.handleDifyStreamResponse(response, onProgress);
    } catch (error) {
      console.error('Dify API流式调用失败:', error);
      throw error;
    }
  }

  // 处理硅基流动的流式响应
  async handleStreamResponse(response, onProgress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                fullContent += delta;
                
                // 调用进度回调
                if (onProgress) {
                  onProgress(fullContent, false);
                }
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', e, data);
            }
          }
        }
      }
      
      // 最终回调
      if (onProgress) {
        onProgress(fullContent, true);
      }
      
      return fullContent.trim();
    } finally {
      reader.releaseLock();
    }
  }

  // 处理Dify的流式响应
  async handleDifyStreamResponse(response, onProgress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.event === 'message' && parsed.answer) {
                fullContent += parsed.answer;
                
                // 调用进度回调
                if (onProgress) {
                  onProgress(fullContent, false);
                }
              } else if (parsed.event === 'message_end') {
                // 流式结束
                if (onProgress) {
                  onProgress(fullContent, true);
                }
                break;
              }
            } catch (e) {
              console.warn('解析Dify流式数据失败:', e, data);
            }
          }
        }
      }
      
      return fullContent.trim();
    } finally {
      reader.releaseLock();
    }
  }

  // 构建翻译提示词
  buildTranslationPrompt(text, targetLanguage) {
    const languageMap = {
      'zh-CN': '中文(简体)',
      'zh-TW': '中文(繁体)',
      'en': '英语',
      'ja': '日语',
      'ko': '韩语',
      'fr': '法语',
      'de': '德语',
      'es': '西班牙语',
      'it': '意大利语',
      'pt': '葡萄牙语',
      'ru': '俄语',
      'ar': '阿拉伯语',
      'hi': '印地语',
      'th': '泰语',
      'vi': '越南语'
    };

    const targetLang = languageMap[targetLanguage] || targetLanguage;

    return `请将以下文本翻译成${targetLang}，自动识别源语言类型，只返回翻译结果，不要包含任何解释或额外内容：

${text}`;
  }

  // 语言检测功能已移除，由大语言模型自动识别

  // 更新设置
  // async updateSettings(newSettings) {
  //   console.log('更新设置，旧设置:', this.settings);
  //   console.log('更新设置，新设置:', newSettings);

  //   this.settings = { ...this.settings, ...newSettings };
  //   console.log('更新后的设置:', this.settings);
  //   await chrome.storage.sync.set({ translator_settings: this.settings });
  // }
}

// Background脚本
class BackgroundScript {
  constructor() {
    this.tabStates = new Map(); // 存储各个标签页的状态
    this.apiManager = null;
    
    this.init();
  }

  // 初始化
  init() {
    this.setupEventListeners();
    this.createContextMenus();
    this.initializeApiManager();
    console.log('翻译插件background脚本已启动');
  }

  // 设置事件监听器
  setupEventListeners() {
    // 监听插件安装/启动
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // 监听快捷键命令
    chrome.commands.onCommand.addListener((command) => {
      this.handleCommand(command);
    });

    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // 监听标签页关闭
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // 监听存储变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  // 创建右键菜单
  createContextMenus() {
    chrome.contextMenus.removeAll(() => {
      // 创建翻译菜单
      chrome.contextMenus.create({
        id: 'translate-selection',
        title: '翻译选中文本',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });

      // 创建选择器菜单
      chrome.contextMenus.create({
        id: 'toggle-selector',
        title: '启动元素选择器',
        contexts: ['page'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });

      // 创建设置菜单
      chrome.contextMenus.create({
        id: 'open-settings',
        title: '打开设置',
        contexts: ['page'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
    });

    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  // 初始化API管理器
  async initializeApiManager() {
    try {
      // 创建API管理器实例
      this.apiManager = new ApiManager();
      
      // 等待API管理器初始化完成
      await this.apiManager.init();
      
      console.log('API管理器已成功初始化');
    } catch (error) {
      console.error('初始化API管理器失败:', error);
      this.apiManager = null;
    }
  }

  // 处理插件安装
  handleInstall(details) {
    if (details.reason === 'install') {
      console.log('插件首次安装');
      // 可以显示欢迎页面或设置向导
      this.showWelcomePage();
    } else if (details.reason === 'update') {
      console.log('插件已更新');
      // 可以显示更新说明
    }
  }

  // 处理快捷键命令
  async handleCommand(command) {
    console.log('快捷键命令:', command);
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;
      
      switch (command) {
        case 'toggle-selector':
          this.sendMessageToContentScript(tab.id, {
            type: 'TOGGLE_SELECTOR'
          });
          break;
          
        default:
          console.log('未知快捷键命令:', command);
      }
    } catch (error) {
      console.error('处理快捷键命令失败:', error);
    }
  }

  // 处理消息
  async handleMessage(request, sender, sendResponse) {
    console.log('收到消息:', request.type, sender.tab?.id);
    
    try {
      switch (request.type) {
        case 'get_settings':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
          
        case 'update_settings':
          const saved = await this.saveSettings(request.data);
          sendResponse({ success: saved });
          break;
          
        case 'translate_text':
          const result = await this.translateText(request.data, sender.tab?.id);
          sendResponse({ success: true, data: result });
          break;
          
        case 'test_api':
          const testResult = await this.testApi(request.data);
          sendResponse({ success: true, data: testResult });
          break;
          
        case 'set_status':
          this.setTabState(sender.tab?.id, request.data);
          sendResponse({ success: true });
          break;
          
        case 'clear_cache':
          const cleared = await this.clearCache();
          sendResponse({ success: cleared });
          break;
          
        case 'reopen_popup_with_result':
          await this.reopenPopupWithResult(request.data, sender.tab);
          sendResponse({ success: true });
          break;
          
        default:
          console.log('未知消息类型:', request.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('处理消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 处理标签页更新
  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      // 标签页加载完成，可以注入content script
      this.injectContentScript(tabId);
    }
  }

  // 处理标签页关闭
  handleTabRemoved(tabId) {
    // 清理标签页状态
    this.tabStates.delete(tabId);
    console.log('标签页已关闭:', tabId);
  }

  // 处理存储变化
  handleStorageChange(changes, namespace) {
    console.log('存储变化:', changes, namespace);
    
    // 通知所有标签页设置已更新
    if (changes.translator_settings) {
      this.broadcastToAllTabs({
        type: 'SETTINGS_UPDATED',
        data: changes.translator_settings.newValue
      });
    }
  }

  // 处理右键菜单点击
  async handleContextMenuClick(info, tab) {
    console.log('右键菜单点击:', info.menuItemId, tab.id);
    
    switch (info.menuItemId) {
      case 'translate-selection':
        if (info.selectionText) {
          await this.translateSelection(info.selectionText, tab.id);
        }
        break;
        
      case 'toggle-selector':
        await this.toggleSelector(tab.id);
        break;
        
      case 'open-settings':
        await this.openSettings();
        break;
    }
  }

  // 翻译选中文本
  async translateSelection(text, tabId) {
    try {
      await this.sendMessageToContentScript(tabId, {
        type: 'TRANSLATE_TEXT',
        data: { text }
      });
    } catch (error) {
      console.error('翻译选中文本失败:', error);
    }
  }

  // 切换选择器
  async toggleSelector(tabId) {
    try {
      await this.sendMessageToContentScript(tabId, {
        type: 'TOGGLE_SELECTOR'
      });
    } catch (error) {
      console.error('切换选择器失败:', error);
    }
  }

  // 打开设置页面
  async openSettings() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html')
      });
    } catch (error) {
      console.error('打开设置页面失败:', error);
    }
  }

  // 显示欢迎页面
  async showWelcomePage() {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html?welcome=true')
      });
    } catch (error) {
      console.error('显示欢迎页面失败:', error);
    }
  }

  // 注入content script
  async injectContentScript(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      // 检查是否为支持的URL
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        return;
      }
      
      // 注入脚本已经在manifest.json中定义，这里可以做额外的检查
      console.log('Content script已准备好注入标签页:', tabId);
      
    } catch (error) {
      console.error('注入content script失败:', error);
    }
  }

  // 发送消息到content script
  async sendMessageToContentScript(tabId, message) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.error('发送消息到content script失败:', error);
      throw error;
    }
  }

  // 广播消息到所有标签页
  async broadcastToAllTabs(message) {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
          try {
            await chrome.tabs.sendMessage(tab.id, message);
          } catch (error) {
            // 忽略无法发送消息的标签页
          }
        }
      }
    } catch (error) {
      console.error('广播消息失败:', error);
    }
  }

  // 获取设置
  async getSettings() {
    try {
      const result = await chrome.storage.sync.get('translator_settings');
      return result.translator_settings || {};
    } catch (error) {
      console.error('获取设置失败:', error);
      return {};
    }
  }

  // 保存设置
  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ translator_settings: settings });
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  }

  // 翻译文本 - 支持流式响应
  async translateText(data, tabId = null) {
    try {
      console.log('=== Background脚本开始流式翻译 ===');
      console.log('翻译数据:', data);
      console.log('目标TabId:', tabId);
      
      // 检查API管理器是否已初始化
      if (!this.apiManager) {
        console.error('API管理器未初始化');
        throw new Error('API管理器未初始化，请重新加载插件');
      }
      
      console.log('API管理器已初始化');
      
      // 检查API管理器的设置
      console.log('API管理器设置:', this.apiManager.settings);
      
      // 创建流式进度回调
      const onProgress = (partialText, isComplete) => {
        console.log('收到流式数据:', { 
          partialTextLength: partialText.length, 
          partialTextPreview: partialText.substring(0, 100) + '...', 
          isComplete 
        });
        
        // 向content script发送流式数据
        if (tabId) {
          try {
            chrome.tabs.sendMessage(tabId, {
              type: 'TRANSLATION_PROGRESS',
              data: {
                originalText: data.text,
                partialText: partialText,
                isComplete: isComplete,
                targetLanguage: data.targetLanguage
              }
            }).catch(error => {
              console.warn('发送流式数据到content script失败:', error);
            });
          } catch (error) {
            console.warn('发送流式数据到content script失败:', error);
          }
        } else {
          // 如果没有tabId，可能是popup发送的请求，尝试向popup发送流式数据
          try {
            chrome.runtime.sendMessage({
              type: 'POPUP_TRANSLATION_PROGRESS',
              data: {
                originalText: data.text,
                partialText: partialText,
                isComplete: isComplete,
                targetLanguage: data.targetLanguage
              }
            }).catch(error => {
              console.warn('发送流式数据到popup失败:', error);
            });
          } catch (error) {
            console.warn('发送流式数据到popup失败:', error);
          }
        }
      };
      
      // 调用API管理器进行实际翻译
      console.log('调用API管理器流式翻译方法...');
      const result = await this.apiManager.translateText(
        data.text,
        data.targetLanguage,
        onProgress
      );
      
      console.log('翻译完成，结果:', result);
      return result;
    } catch (error) {
      console.error('翻译文本失败:', error);
      console.error('错误堆栈:', error.stack);
      throw error;
    }
  }

  // 测试API
  async testApi(data) {
    try {
      const { apiType, apiKey, baseUrl, selectedModel } = data;
      
      if (!apiKey || apiKey.trim() === '') {
        return {
          success: false,
          message: 'API密钥不能为空',
          error: 'API密钥不能为空'
        };
      }

      // 调用API管理器进行实际测试
      const result = await this.apiManager.testApi(apiType, apiKey, baseUrl, selectedModel);
      
      return {
        success: result.success,
        message: result.success ? `${apiType} API连接成功` : `${apiType} API连接失败`,
        error: result.success ? null : result.error
      };
    } catch (error) {
      console.error('测试API失败:', error);
      return {
        success: false,
        message: 'API测试失败',
        error: error.message
      };
    }
  }

  // 设置标签页状态
  setTabState(tabId, state) {
    if (!tabId) return;
    
    this.tabStates.set(tabId, {
      ...this.tabStates.get(tabId),
      ...state,
      timestamp: Date.now()
    });
  }

  // 获取标签页状态
  getTabState(tabId) {
    return this.tabStates.get(tabId) || {};
  }

  // 清空缓存
  async clearCache() {
    try {
      await chrome.storage.local.remove('translation_cache');
      return true;
    } catch (error) {
      console.error('清空缓存失败:', error);
      return false;
    }
  }

  // 重新打开popup显示翻译结果
  async reopenPopupWithResult(translationResult, tab) {
    try {
      console.log('尝试重新打开popup，翻译结果:', translationResult);
      
      // 尝试使用chrome.action.openPopup API (Chrome 99+)
      if (chrome.action && chrome.action.openPopup) {
        try {
          await chrome.action.openPopup();
          console.log('成功使用chrome.action.openPopup重新打开popup');
          return;
        } catch (error) {
          console.log('chrome.action.openPopup失败:', error);
        }
      }
      
      // 如果无法直接打开popup，尝试其他方式
      // 1. 修改扩展图标提示用户
      if (chrome.action && chrome.action.setBadgeText) {
        await chrome.action.setBadgeText({
          text: '✓',
          tabId: tab?.id
        });
        
        await chrome.action.setBadgeBackgroundColor({
          color: '#28a745',
          tabId: tab?.id
        });
        
        // 5秒后清除badge
        setTimeout(() => {
          chrome.action.setBadgeText({
            text: '',
            tabId: tab?.id
          });
        }, 5000);
      }
      
      // 2. 可以考虑使用通知API（需要权限）
      console.log('已通过badge提示用户查看翻译结果');
      
    } catch (error) {
      console.error('重新打开popup失败:', error);
    }
  }

  // 获取所有标签页状态
  getAllTabStates() {
    return Object.fromEntries(this.tabStates);
  }
}

// 创建全局实例
const backgroundScript = new BackgroundScript(); 