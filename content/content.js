// 内容脚本主文件
if (typeof window.TranslatorContentScript === 'undefined') {
  class TranslatorContentScript {
    constructor() {
      this.constants = window.TRANSLATOR_CONSTANTS || {};
      this.storageManager = window.TranslatorStorageManagerInstance || null;
      this.uiOverlay = window.uiOverlay || null;
      this.elementSelector = window.elementSelector || null;
      this.translator = window.translatorEngine || null;
      
      this.isInitialized = false;
      this.settings = null;
      
      this.init();
    }

  // 初始化
  async init() {
    if (this.isInitialized) return;
    
    try {
      // 等待所有组件初始化完成
      await this.waitForComponents();
      
      // 加载设置
      this.settings = await this.storageManager.getSettings();
      
      // 绑定事件
      this.bindEvents();
      
      // 创建右键菜单
      // this.createContextMenu();//不要右键菜单了，直接翻译
      
      // 监听来自background的消息
      this.listenToBackgroundMessages();
      
      this.isInitialized = true;
      console.log('翻译插件内容脚本已加载');
      
    } catch (error) {
      console.error('内容脚本初始化失败:', error);
    }
  }

  // 等待组件加载
  async waitForComponents() {
    const maxWait = 5000; // 最大等待5秒
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      // 重新获取依赖组件的引用
      this.constants = window.TRANSLATOR_CONSTANTS || this.constants;
      this.storageManager = window.TranslatorStorageManagerInstance || this.storageManager;
      this.uiOverlay = window.uiOverlay || this.uiOverlay;
      this.elementSelector = window.elementSelector || this.elementSelector;
      this.translator = window.translatorEngine || this.translator;
      
      // 检查常量是否加载
      if (!this.constants || Object.keys(this.constants).length === 0) {
        console.log('等待常量加载...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 检查存储管理器
      if (!this.storageManager) {
        console.log('等待存储管理器加载...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 检查UI叠加层
      if (!this.uiOverlay) {
        console.log('等待UI叠加层加载...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 检查元素选择器
      if (!this.elementSelector) {
        console.log('等待元素选择器加载...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 检查翻译器
      if (!this.translator) {
        console.log('等待翻译器加载...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 检查组件是否已经初始化完成
      if (!this.elementSelector.isInitialized) {
        console.log('等待元素选择器初始化...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      if (!this.translator.isInitialized) {
        console.log('等待翻译器初始化...');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // 所有组件都已加载并初始化完成
      console.log('所有组件已加载并初始化完成');
      return;
    }
    
         // 提供更详细的错误信息
     const missing = [];
     if (!this.constants || Object.keys(this.constants).length === 0) missing.push('constants');
     if (!this.storageManager) missing.push('storageManager');
     if (!this.uiOverlay) missing.push('uiOverlay');
     if (!this.elementSelector) missing.push('elementSelector');
     else if (!this.elementSelector.isInitialized) missing.push('elementSelector(未初始化)');
     if (!this.translator) missing.push('translator');
     else if (!this.translator.isInitialized) missing.push('translator(未初始化)');
     
     throw new Error(`组件加载超时，缺失: ${missing.join(', ')}`);
   }

  // 绑定事件
  bindEvents() {
    // 监听设置变化
    this.storageManager.onStorageChanged((type, change) => {
      if (type === 'settings') {
        this.settings = change.newValue;
        this.updateContextMenu();
      }
    });
    
    // 监听快捷键
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });
    
    // 监听选择器事件
    window.addEventListener(this.constants.SELECTOR_CONFIG.events.SELECTOR_TOGGLE, (event) => {
      this.handleSelectorToggle(event.detail);
    });
    
    window.addEventListener(this.constants.SELECTOR_CONFIG.events.ELEMENT_SELECT, (event) => {
      this.handleElementSelect(event.detail);
    });
    
    window.addEventListener(this.constants.SELECTOR_CONFIG.events.TRANSLATION_COMPLETE, (event) => {
      this.handleTranslationComplete(event.detail);
    });
    
    window.addEventListener(this.constants.SELECTOR_CONFIG.events.TRANSLATION_ERROR, (event) => {
      this.handleTranslationError(event.detail);
    });
  }

  // 创建右键菜单
  createContextMenu() {
    if (!this.settings.enableContextMenu) return;
    
    document.addEventListener('contextmenu', (event) => {
      const element = event.target;
      const text = this.elementSelector.extractElementText(element);
      
      if (text && text.trim().length > 0) {
        // 这里可以添加自定义右键菜单项
        // 但由于Content Script限制，我们使用现有的方式
        this.showContextMenuOptions(event, element, text);
      }
    });
  }

  // 显示右键菜单选项
  showContextMenuOptions(event, element, text) {
    // 创建临时菜单
    const menu = document.createElement('div');
    menu.className = 'translator-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000004;
      padding: 4px 0;
      min-width: 120px;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    
    // 添加菜单项
    const translateItem = document.createElement('div');
    translateItem.className = 'translator-context-item';
    translateItem.textContent = t('translate_this');
    translateItem.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 0;
      transition: background-color 0.2s;
    `;
    
    translateItem.addEventListener('mouseenter', () => {
      translateItem.style.backgroundColor = '#f0f0f0';
    });
    
    translateItem.addEventListener('mouseleave', () => {
      translateItem.style.backgroundColor = 'transparent';
    });
    
    translateItem.addEventListener('click', () => {
      this.translateElement(element, text);
      menu.remove();
    });
    
    menu.appendChild(translateItem);
    
    // 添加选择器菜单项
    const selectorItem = document.createElement('div');
    selectorItem.className = 'translator-context-item';
    selectorItem.textContent = t('select_and_translate');
    selectorItem.style.cssText = translateItem.style.cssText;
    
    selectorItem.addEventListener('mouseenter', () => {
      selectorItem.style.backgroundColor = '#f0f0f0';
    });
    
    selectorItem.addEventListener('mouseleave', () => {
      selectorItem.style.backgroundColor = 'transparent';
    });
    
    selectorItem.addEventListener('click', () => {
      this.elementSelector.toggle();
      menu.remove();
    });
    
    menu.appendChild(selectorItem);
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }

  // 监听来自background的消息
  listenToBackgroundMessages() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleBackgroundMessage(request, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  // 处理来自background的消息
  async handleBackgroundMessage(request, sender, sendResponse) {
    console.log('handleBackgroundMessage', request, sender, sendResponse);
    try {
      switch (request.type) {
        case this.constants.MESSAGE_TYPES.PING:
          // 重新获取组件引用
          this.storageManager = window.TranslatorStorageManager || this.storageManager;
          this.uiOverlay = window.uiOverlay || this.uiOverlay;
          this.elementSelector = window.elementSelector || this.elementSelector;
          this.translator = window.translatorEngine || this.translator;
          
          // 检查所有组件是否正确初始化
          const isReady = this.isInitialized && 
                         this.elementSelector && 
                         this.translator && 
                         this.uiOverlay && 
                         this.storageManager &&
                         this.elementSelector.isInitialized && 
                         this.translator.isInitialized;
          
          console.log('PING检查结果:', {
            isInitialized: this.isInitialized,
            hasElementSelector: !!this.elementSelector,
            hasTranslator: !!this.translator,
            hasUiOverlay: !!this.uiOverlay,
            hasStorageManager: !!this.storageManager,
            elementSelectorReady: this.elementSelector?.isInitialized,
            translatorReady: this.translator?.isInitialized,
            isReady
          });
          
          sendResponse({ success: true, ready: isReady });
          break;
          
        case this.constants.MESSAGE_TYPES.TOGGLE_SELECTOR:
          if (!this.elementSelector) {
            sendResponse({ success: false, error: '选择器未初始化' });
            return;
          }
          this.elementSelector.toggle();
          sendResponse({ success: true });
          break;
          
        case this.constants.MESSAGE_TYPES.GET_STATUS:
          const status = this.getStatus();
          sendResponse({ success: true, data: status });
          break;
          
        case this.constants.MESSAGE_TYPES.TRANSLATE_TEXT:
          const { text, element } = request.data;
          console.log('translate_text', text, element);
          // 1. 先弹出“正在翻译”面板
          this.uiOverlay.showTranslationPanel(document.body, text, '', false, false);
          // 2. 调用翻译
          await this.translator.translateText(text, element);
          sendResponse({ success: true });
          break;
          
        case this.constants.MESSAGE_TYPES.GET_SETTINGS:
          const settings = await this.storageManager.getSettings();
          sendResponse({ success: true, data: settings });
          break;
          
        case this.constants.MESSAGE_TYPES.UPDATE_SETTINGS:
          const updated = await this.storageManager.updateSettings(request.data);
          sendResponse({ success: updated });
          break;
          
        case this.constants.MESSAGE_TYPES.CLEAR_CACHE:
          const cleared = await this.storageManager.clearCache();
          sendResponse({ success: cleared });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('处理background消息失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 处理键盘快捷键
  handleKeyboardShortcut(event) {
    if (!this.settings.enableShortcut) return;
    
    // Ctrl+Shift+T: 切换选择器
    if (event.ctrlKey && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      this.elementSelector.toggle();
    }
    
    // Ctrl+Shift+C: 清空缓存
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
      event.preventDefault();
      this.storageManager.clearCache();
    }
  }

  // 处理选择器切换
  handleSelectorToggle(detail) {
    console.log('选择器状态:', detail.active ? '激活' : '关闭');
    
    // 通知background脚本
    chrome.runtime.sendMessage({
      type: this.constants.MESSAGE_TYPES.SET_STATUS,
      data: {
        selectorActive: detail.active,
        state: detail.state
      }
    });
  }

  // 处理元素选择
  handleElementSelect(detail) {
    console.log('元素已选择:', detail.element, detail.text);
    
    // 记录选择历史
    this.recordElementSelection(detail);
  }

  // 处理翻译完成
  handleTranslationComplete(detail) {
    console.log('翻译完成:', detail.originalText, '->', detail.translatedText);
    
    // 记录翻译历史
    this.recordTranslationHistory(detail);
  }

  // 处理翻译错误
  handleTranslationError(detail) {
    console.error('翻译错误:', detail.error);
    
    // 显示错误通知
    this.showErrorNotification(detail.error);
  }

  // 翻译元素
  async translateElement(element, text) {
    try {
      // 选中元素
      // this.uiOverlay.selectElement(element);
      this.elementSelector.selectElement(element);
      
      // 显示翻译面板
      this.uiOverlay.showTranslationPanel(element, text);
      
      // 开始翻译
      await this.translator.translateText(text, element);
      
    } catch (error) {
      console.error('翻译元素失败:', error);
      this.showErrorNotification(error.message);
    }
  }

  // 记录元素选择历史
  recordElementSelection(detail) {
    const selection = {
      timestamp: Date.now(),
      element: {
        tagName: detail.element.tagName,
        className: detail.element.className,
        id: detail.element.id
      },
      text: detail.text,
      selector: detail.selector,
      url: window.location.href
    };
    
    // 这里可以保存到本地存储
    // 暂时只在控制台记录
    console.log('选择记录:', selection);
  }

  // 记录翻译历史
  recordTranslationHistory(detail) {
    const history = {
      timestamp: Date.now(),
      originalText: detail.originalText,
      translatedText: detail.translatedText,
      sourceLanguage: detail.sourceLanguage,
      targetLanguage: detail.targetLanguage,
      url: window.location.href
    };
    
    // 这里可以保存到本地存储
    // 暂时只在控制台记录
    console.log('翻译记录:', history);
  }

  // 显示错误通知
  showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'translator-error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000005;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      word-wrap: break-word;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 更新右键菜单
  updateContextMenu() {
    // 根据设置更新菜单状态
    if (this.settings.enableContextMenu) {
      this.createContextMenu();
    }
  }

  // 获取当前状态
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      selectorActive: this.elementSelector ? this.elementSelector.isActive : false,
      selectorState: this.elementSelector ? this.elementSelector.getState() : null,
      translationState: this.translator ? this.translator.getTranslationState() : null,
      settings: this.settings,
      url: window.location.href,
      timestamp: Date.now()
    };
  }

  // 销毁
  destroy() {
    try {
      if (this.uiOverlay && typeof this.uiOverlay.destroy === 'function') {
        this.uiOverlay.destroy();
      }
      if (this.elementSelector && typeof this.elementSelector.destroy === 'function') {
        this.elementSelector.destroy();
      }
      if (this.translator && typeof this.translator.destroy === 'function') {
        this.translator.destroy();
      }
      
      this.isInitialized = false;
      console.log('翻译插件内容脚本已销毁');
    } catch (error) {
      console.error('销毁内容脚本时出错:', error);
    }
  }
}

  // 将类暴露到全局
  window.TranslatorContentScript = TranslatorContentScript;
  
  // 为了向后兼容，也暴露为ContentScript（如果没有冲突）
  if (typeof window.ContentScript === 'undefined') {
    window.ContentScript = TranslatorContentScript;
  }
}

// 延迟创建TranslatorContentScript实例
function createContentScript() {
  if (typeof window !== 'undefined' && !window.contentScript) {
    try {
      window.contentScript = new window.TranslatorContentScript();
      console.log('TranslatorContentScript 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorContentScript 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 等待基础组件加载完成后再创建TranslatorContentScript
function waitForDependenciesAndCreateContentScript() {
  let attempts = 0;
  const maxAttempts = 50; // 最多尝试50次，共5秒
  
  const tryCreate = () => {
    attempts++;
    
    // 检查基础组件是否已加载
    if (window.TranslatorStorageManager && window.uiOverlay && window.elementSelector && window.translatorEngine) {
      if (createContentScript()) {
        console.log('TranslatorContentScript 创建成功，依赖检查完成');
        return;
      }
    }
    
    if (attempts < maxAttempts) {
      setTimeout(tryCreate, 100);
    } else {
      console.error('TranslatorContentScript 创建超时，基础组件未能及时加载');
    }
  };
  
  tryCreate();
}

// 创建内容脚本实例
if (typeof window !== 'undefined' && !window.contentScript) {
  // 根据页面加载状态决定初始化时机
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForDependenciesAndCreateContentScript();
    });
  } else {
    waitForDependenciesAndCreateContentScript();
  }
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (window.contentScript) {
    window.contentScript.destroy();
  }
}); 