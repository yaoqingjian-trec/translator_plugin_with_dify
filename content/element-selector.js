// 元素选择器
if (typeof window.TranslatorElementSelector === 'undefined') {
  class TranslatorElementSelector {
    constructor() {
      this.constants = window.TRANSLATOR_CONSTANTS || {};
      this.uiOverlay = window.uiOverlay || null;
      this.storageManager = window.TranslatorStorageManagerInstance || null;

      this.isActive = false;
      this.isSelecting = false;
      this.currentElement = null;
      this.settings = null;
      this.isInitialized = false;

      this.boundHandlers = {
        mouseover: this.handleMouseOver.bind(this),
        mouseout: this.handleMouseOut.bind(this),
        click: this.handleClick.bind(this),
        keydown: this.handleKeyDown.bind(this)
      };

      // 延迟初始化，等待依赖组件准备完成
      this.initWhenReady();
    }

    // 等待依赖组件准备完成后初始化
    async initWhenReady() {
      const maxWait = 5000; // 最多等待5秒
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        // 重新获取依赖组件的引用
        this.storageManager = window.TranslatorStorageManagerInstance || this.storageManager;
        this.uiOverlay = window.uiOverlay || this.uiOverlay;

        if (this.storageManager && typeof this.storageManager.getSettings === 'function') {
          await this.init();
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.error('ElementSelector: 依赖组件加载超时');
    }

    // 初始化
    async init() {
      try {
        this.settings = await this.storageManager.getSettings();
        this.bindEvents();
        this.bindStreamingEvents(); // 添加流式消息监听
        this.isInitialized = true;
        console.log('ElementSelector 初始化完成');
      } catch (error) {
        console.error('ElementSelector 初始化失败:', error);
      }
    }

    // 绑定事件
    bindEvents() {
      // 监听设置变化
      this.storageManager.onStorageChanged((type, change) => {
        if (type === 'settings') {
          this.settings = change.newValue;
        }
      });
    }

    // 绑定流式消息监听
    bindStreamingEvents() {
      // 监听流式翻译进度
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'TRANSLATION_PROGRESS') {
          this.handleStreamingProgress(message.data);
        }
      });
    }

    // 处理流式翻译进度
    handleStreamingProgress(data) {
      console.log('收到流式翻译进度:', data);

      if (this.currentTranslationPanel) {
        // 更新流式显示
        this.updateStreamingTranslationPanel(
          data.originalText,
          data.partialText,
          data.isComplete,
          data.targetLanguage
        );

        // 如果翻译完成，延迟2秒后切换到完整界面
        if (data.isComplete) {
          setTimeout(() => {
            if (this.currentTranslationPanel) {
              this.updateDirectTranslationPanel(
                data.originalText,
                data.partialText,
                false,
                false
              );
            }
          }, 2000);
        }
      }
    }

    // 切换选择器状态
    toggle() {
      if (this.isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
    }

    // 激活选择器
    activate() {
      if (this.isActive) return;

      this.isActive = true;
      this.isSelecting = true;

      // 显示UI遮罩
      this.uiOverlay.show();

      // 绑定事件监听器
      this.addEventListeners();

      // 设置鼠标样式
      this.uiOverlay.setCursor('crosshair');

      console.log('元素选择器已激活');
    }

    // 停用选择器
    deactivate() {
      if (!this.isActive) return;

      this.isActive = false;
      this.isSelecting = false;

      // 隐藏UI遮罩
      this.uiOverlay.hide();

      // 移除事件监听器
      this.removeEventListeners();

      // 恢复鼠标样式
      this.uiOverlay.resetCursor();

      // 清理当前元素
      this.currentElement = null;

      console.log('元素选择器已停用');
    }

    // 添加事件监听器
    addEventListeners() {
      document.addEventListener('mouseover', this.boundHandlers.mouseover, true);
      document.addEventListener('mouseout', this.boundHandlers.mouseout, true);
      document.addEventListener('click', this.boundHandlers.click, true);
      document.addEventListener('keydown', this.boundHandlers.keydown, true);
    }

    // 移除事件监听器
    removeEventListeners() {
      document.removeEventListener('mouseover', this.boundHandlers.mouseover, true);
      document.removeEventListener('mouseout', this.boundHandlers.mouseout, true);
      document.removeEventListener('click', this.boundHandlers.click, true);
      document.removeEventListener('keydown', this.boundHandlers.keydown, true);
    }

    // 处理鼠标悬停
    handleMouseOver(event) {
      if (!this.isActive || !this.isSelecting) return;

      const element = event.target;
      if (!this.isValidElement(element)) return;

      this.currentElement = element;
      this.uiOverlay.highlightElement(element);
      this.uiOverlay.showTooltip(element, this.getElementDescription(element));
    }

    // 处理鼠标离开
    handleMouseOut(event) {
      if (!this.isActive || !this.isSelecting) return;

      this.uiOverlay.hideTooltip();
    }

    // 处理点击
    handleClick(event) {
      if (!this.isActive || !this.isSelecting) return;

      event.preventDefault();
      event.stopPropagation();

      const element = event.target;
      if (!this.isValidElement(element)) return;

      this.selectElement(element);
    }

    // 处理键盘事件
    handleKeyDown(event) {
      if (!this.isActive) return;

      if (event.key === 'Escape') {
        this.deactivate();
      }
    }

    // 选择元素
    selectElement(element) {
      if (!element) return;

      this.currentElement = element;
      this.isSelecting = false;

      // 获取元素文本
      const text = this.extractTextFromElement(element);

      if (!text || text.trim().length === 0) {
        this.uiOverlay.showNotification('选中的元素没有文本内容');
        return;
      }

      // if (text.length > 5000) {
      //   this.uiOverlay.showNotification('文本内容过长，请选择较短的文本');
      //   return;
      // }

      console.log('选中元素:', element, '文本:', text);

      // 🚀 直接创建翻译面板（绕过复杂的uiOverlay系统）
      this.createDirectTranslationPanel(element, text);

      // 测试面板已移除，使用新的直接翻译面板系统

      // 存储选择的数据到storage，以便popup重新打开时使用
      const selectedData = {
        text: text,
        timestamp: Date.now(),
        isTranslating: true, // 标记正在翻译
        element: {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          xpath: this.getElementXPath(element)
        }
      };

      // 保存到storage
      chrome.storage.local.set({
        'translator_selected_element': selectedData
      });

      // 发送消息到popup（如果打开）
      try {
        chrome.runtime.sendMessage({
          type: this.constants.MESSAGE_TYPES.ELEMENT_SELECTED,
          data: selectedData
        });
      } catch (error) {
        console.log('发送消息到popup失败（popup可能已关闭）:', error);
      }

      // 已经通过页面内翻译面板显示进度，无需额外通知

      // 开始翻译
      this.startTranslation(element, text);
    }

    // 开始翻译
    async startTranslation(element, text) {
      try {
        // 开始翻译

        // 使用新的直接翻译面板系统
        // if (this.uiOverlay) {
        //   this.uiOverlay.showTranslationPanel(element, text, '翻译中...');
        // } else {
        //   console.error('uiOverlay 不存在！');
        // }

        // 发送翻译请求
        const messageType = this.constants.MESSAGE_TYPES?.TRANSLATE_TEXT || 'translate_text';

        // 发送翻译请求
        const response = await chrome.runtime.sendMessage({
          type: messageType,
          data: {
            text: text,
            targetLanguage: this.settings.targetLanguage
          }
        });

        if (response && response.success) {
          // 使用新的直接翻译面板系统
          // this.uiOverlay.showTranslationPanel(element, text, response.data.translatedText, true);

          // 保存翻译结果到storage，包含原文和译文
          const translationResult = {
            originalText: text,
            translatedText: response.data.translatedText,

            targetLanguage: response.data.targetLanguage || this.settings.targetLanguage,
            timestamp: Date.now(),
            isTranslating: false, // 翻译完成
            element: {
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              xpath: this.getElementXPath(element)
            }
          };

          // 更新storage中的选择数据，添加翻译结果
          chrome.storage.local.set({
            'translator_selected_element': translationResult
          });

          // 翻译完成，结果已保存

          // 翻译结果已在页面内面板显示，无需额外通知

        } else {
          throw new Error(response?.error || '翻译失败');
        }

      } catch (error) {
        console.error('翻译失败:', error);
        // 使用新的直接翻译面板系统
        // this.uiOverlay.showTranslationPanel(element, text, '翻译失败: ' + error.message, false, true);

        // 即使翻译失败，也保存错误信息
        const errorResult = {
          originalText: text,
          translatedText: null,
          error: error.message,
          timestamp: Date.now(),
          isTranslating: false, // 翻译完成（失败）
          element: {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            xpath: this.getElementXPath(element)
          }
        };

        chrome.storage.local.set({
          'translator_selected_element': errorResult
        });

        // 翻译失败，错误信息已保存

        // 翻译失败信息已在页面内面板显示，无需额外通知
      }
    }

    // 检查元素是否有效
    isValidElement(element) {
      if (!element) return false;

      // 排除特定标签
      const excludeTags = this.constants.SELECTOR_CONFIG.excludeElements;
      if (excludeTags.includes(element.tagName.toLowerCase())) {
        return false;
      }

      // 排除特定类名
      const excludeClasses = this.constants.SELECTOR_CONFIG.excludeClasses;
      for (const className of excludeClasses) {
        if (element.className && element.className.includes(className)) {
          return false;
        }
      }

      // 排除翻译器组件
      if (element.closest('.translator-overlay, .translator-tooltip, .translator-panel')) {
        return false;
      }

      return true;
    }

    // 提取元素文本
    extractTextFromElement(element) {
      if (!element) return '';

      // 处理输入元素
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return element.value || element.placeholder || '';
      }

      // 处理图片alt文本
      if (element.tagName === 'IMG') {
        return element.alt || element.title || '';
      }

      // 处理链接title
      if (element.tagName === 'A') {
        return element.textContent || element.title || '';
      }

      // 获取文本内容
      let text = '';
      if (element.textContent) {
        text = element.textContent.trim();
      } else if (element.innerText) {
        text = element.innerText.trim();
      }

      return text;
    }

    // 为向后兼容提供别名方法
    extractElementText(element) {
      return this.extractTextFromElement(element);
    }

    // 获取元素描述
    getElementDescription(element) {
      if (!element) return '';

      const tag = element.tagName.toLowerCase();
      const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
      const id = element.id ? `#${element.id}` : '';

      return `${tag}${id}${className}`;
    }

    // 获取元素XPath
    getElementXPath(element) {
      if (!element) return '';

      const getElementIndex = (element) => {
        const siblings = Array.from(element.parentNode.children);
        return siblings.indexOf(element) + 1;
      };

      const path = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const tagName = current.tagName.toLowerCase();

        if (current.id) {
          path.unshift(`//${tagName}[@id="${current.id}"]`);
          break;
        } else {
          const index = getElementIndex(current);
          path.unshift(`/${tagName}[${index}]`);
        }

        current = current.parentNode;
      }

      return path.join('');
    }



    // 旧的测试面板代码已移除

    // 🚀 直接创建翻译面板
    createDirectTranslationPanel(element, text) {
      console.log('🚀 创建直接翻译面板');

      // 移除之前的翻译面板
      const existingPanel = document.getElementById('direct-translation-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      // 获取元素位置
      const rect = element.getBoundingClientRect();
      let left = rect.right + 10;
      let top = rect.bottom + 10;

      // 简单的边界检查
      if (left + 400 > window.innerWidth) {
        left = rect.left - 410;
      }
      if (left < 0) {
        left = 10;
      }
      if (top + 300 > window.innerHeight) {
        top = rect.top - 310;
      }
      if (top < 0) {
        top = 10;
      }

      // 创建翻译面板
      const panel = document.createElement('div');
      panel.id = 'direct-translation-panel';

      // 设置样式
      panel.style.cssText = `
        position: fixed;
        left: ${left}px;
        top: ${top}px;
        width: 400px;
        max-height: 500px;
        background: #ffffff;
        border: 2px solid #007bff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 999999999;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        opacity: 1;
        visibility: visible;
      `;

      // 只初始化结构，内容后续动态填充
      panel.innerHTML = `
        <div id="translation-panel-header" style="padding: 16px; border-bottom: 1px solid #eee; flex-shrink: 0;">
          <h3 id="translation-panel-status" style="margin: 0 0 8px 0; color: #007bff; font-size: 16px;">🔄 正在翻译...</h3>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 原文:</div>
            <div id="translation-panel-original" style="font-size: 14px; color: #333; line-height: 1.4; background: #f8f9fa; padding: 8px; border-radius: 4px; max-height: 100px; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap;">${text}</div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🌍 译文:</div>
            <div id="streaming-translation-text" style="font-size: 14px; color: #007bff; line-height: 1.4; background: #e3f2fd; padding: 8px; border-radius: 4px; max-height: 200px; min-height: 40px; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap; position: relative;"></div>
          </div>
          <div id="translation-panel-progress" style="display: flex; align-items: center; gap: 8px; padding: 16px; background: #f0f8ff; border-radius: 4px;">
            <div style="width: 20px; height: 20px; border: 2px solid #e3f2fd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="font-size: 13px; color: #007bff;">正在翻译中，请稍候...</div>
          </div>
        </div>
        <div id="translation-panel-footer" style="padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0;">
          <button onclick="document.getElementById('direct-translation-panel').remove()" 
                  style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            ❌ 关闭
          </button>
        </div>
      `;

      // 添加CSS动画和滚动条样式
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* 美化滚动条 */
        #direct-translation-panel *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        #direct-translation-panel *::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        #direct-translation-panel *::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        #direct-translation-panel *::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        #direct-translation-panel *::-webkit-scrollbar-corner {
          background: #f1f1f1;
        }
      `;
      document.head.appendChild(style);

      // 添加到DOM
      document.body.appendChild(panel);

      console.log('🚀 直接翻译面板已创建，位置:', left, top);

      // 存储面板引用
      this.currentTranslationPanel = panel;

      // 开始翻译
      this.startDirectTranslation(element, text);
    }

    // 🚀 开始直接翻译 - 流式版本
    async startDirectTranslation(element, text) {
      console.log('🚀 开始流式直接翻译');

      // 存储当前翻译的上下文，用于重试
      this.currentTranslationContext = {
        element: element,
        text: text
      };

      try {
        // 发送翻译请求（流式）
        const messageType = this.constants.MESSAGE_TYPES?.TRANSLATE_TEXT || 'translate_text';

        // 异步发送请求，不等待结果，依赖流式数据更新界面
        chrome.runtime.sendMessage({
          type: messageType,
          data: {
            text: text,
            targetLanguage: this.settings.targetLanguage
          }
        }).then(response => {
          console.log('翻译请求已发送:', response);

          // 如果响应失败且没有收到流式数据，显示错误
          if (!response || !response.success) {
            setTimeout(() => {
              if (this.currentTranslationPanel) {
                this.updateDirectTranslationPanel(text, response?.error || '翻译失败', true);
              }
            }, 5000); // 5秒后如果还没有流式数据，显示错误
          }
        }).catch(error => {
          console.error('发送翻译请求失败:', error);
          this.updateDirectTranslationPanel(text, '翻译失败: ' + error.message, true);
        });

      } catch (error) {
        console.error('直接翻译失败:', error);
        this.updateDirectTranslationPanel(text, '翻译失败: ' + error.message, true);
      }
    }

    // 🚀 重试翻译
    async retryTranslation() {
      console.log('🚀 重试翻译');

      if (!this.currentTranslationContext) {
        console.error('没有翻译上下文信息');
        return;
      }

      // 重新显示翻译中状态
      this.updateDirectTranslationPanel(this.currentTranslationContext.text, '正在重试翻译...', false, true);

      try {
        // 发送翻译请求
        const messageType = this.constants.MESSAGE_TYPES?.TRANSLATE_TEXT || 'translate_text';
        const response = await chrome.runtime.sendMessage({
          type: messageType,
          data: {
            text: this.currentTranslationContext.text,
            targetLanguage: this.settings.targetLanguage
          }
        });

        if (response && response.success) {
          // 翻译成功，更新面板
          this.updateDirectTranslationPanel(this.currentTranslationContext.text, response.data.translatedText, false);
        } else {
          // 翻译失败
          this.updateDirectTranslationPanel(this.currentTranslationContext.text, response?.error || '翻译失败', true);
        }
      } catch (error) {
        console.error('重试翻译失败:', error);
        this.updateDirectTranslationPanel(this.currentTranslationContext.text, '重试翻译失败: ' + error.message, true);
      }
    }

    // 🚀 更新直接翻译面板
    updateDirectTranslationPanel(originalText, translatedText, isError = false, isRetrying = false) {
      if (!this.currentTranslationPanel) return;

      let statusColor, statusIcon, statusText;

      if (isRetrying) {
        statusColor = '#007bff';
        statusIcon = '🔄';
        statusText = '正在重试...';
      } else if (isError) {
        statusColor = '#dc3545';
        statusIcon = '❌';
        statusText = '翻译失败';
      } else {
        statusColor = '#28a745';
        statusIcon = '✅';
        statusText = '翻译完成';
      }

      // 更新面板内容
      this.currentTranslationPanel.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid #eee; flex-shrink: 0; overflow-y: auto;">
          <h3 style="margin: 0 0 8px 0; color: ${statusColor}; font-size: 16px;">${statusIcon} ${statusText}</h3>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 原文:</div>
            <div style="font-size: 14px; color: #333; line-height: 1.4; background: #f8f9fa; padding: 8px; border-radius: 4px; max-height: 100px; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap;">${originalText}</div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${isError ? '❌ 错误信息:' : '🌍 译文:'}</div>
            <div style="font-size: 14px; color: ${isError ? '#dc3545' : '#007bff'}; line-height: 1.4; background: ${isError ? '#f8d7da' : '#e3f2fd'}; padding: 8px; border-radius: 4px; font-weight: ${isError ? 'normal' : '500'}; max-height: 200px; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap;">${translatedText}</div>
          </div>
        </div>
        <div style="padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0;">
          ${!isError && !isRetrying ? `
            <button onclick="navigator.clipboard.writeText('${translatedText.replace(/'/g, '\\\'')}')" 
                    style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              📋 复制
            </button>
            <button onclick="window.translatorRetryTranslation()" 
                    style="padding: 6px 12px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🔄 重试
            </button>
          ` : isError ? `
            <button onclick="window.translatorRetryTranslation()" 
                    style="padding: 6px 12px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🔄 重试
            </button>
          ` : `
            <div style="display: flex; align-items: center; gap: 8px; padding: 6px 12px;">
              <div style="width: 16px; height: 16px; border: 2px solid #e3f2fd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="font-size: 12px; color: #007bff;">重试中...</span>
            </div>
          `}
          <button onclick="document.getElementById('direct-translation-panel').remove()" 
                  style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            ❌ 关闭
          </button>
        </div>
      `;

      console.log('🚀 翻译面板已更新:', statusText);
    }

    // 🚀 更新流式翻译面板（textContent+=delta方式，彻底无闪动）
    updateStreamingTranslationPanel(originalText, partialText, isComplete, targetLanguage) {
      if (!this.currentTranslationPanel) return;
      // 状态栏
      const statusColor = isComplete ? '#28a745' : '#007bff';
      const statusIcon = isComplete ? '✅' : '🔄';
      const statusText = isComplete ? '翻译完成' : '正在翻译';
      const statusElem = this.currentTranslationPanel.querySelector('#translation-panel-status');
      if (statusElem) {
        statusElem.textContent = `${statusIcon} ${statusText}`;
        statusElem.style.color = statusColor;
      }
      // 译文内容区
      const textElem = this.currentTranslationPanel.querySelector('#streaming-translation-text');
      if (!this._lastStreamedText) this._lastStreamedText = '';
      if (textElem) {
        // 只追加新内容
        const currentLength = textElem.textContent.length;
        if (partialText.length > currentLength) {
          const newText = partialText.slice(currentLength);
          textElem.appendChild(document.createTextNode(newText));
        }
        this._lastStreamedText = partialText;
      }
      // 进度条
      const progressElem = this.currentTranslationPanel.querySelector('#translation-panel-progress');
      if (progressElem) {
        progressElem.style.display = isComplete ? 'none' : 'flex';
      }
      // 按钮区（全部用JS创建并addEventListener绑定）
      const footerElem = this.currentTranslationPanel.querySelector('#translation-panel-footer');
      if (footerElem) {
        // 清空原有内容
        footerElem.innerHTML = '';
        if (isComplete) {
          // 复制按钮
          const copyBtn = document.createElement('button');
          copyBtn.textContent = '📋 复制';
          copyBtn.style = 'padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(partialText);
          });
          footerElem.appendChild(copyBtn);
          // 重试按钮
          const retryBtn = document.createElement('button');
          retryBtn.textContent = '🔄 重试';
          retryBtn.style = 'padding: 6px 12px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
          retryBtn.addEventListener('click', () => {
            if (window.translatorRetryTranslation) window.translatorRetryTranslation();
          });
          footerElem.appendChild(retryBtn);
        }
        // 关闭按钮（始终有）
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '❌ 关闭';
        closeBtn.style = 'padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;';
        closeBtn.addEventListener('click', () => {
          const panel = document.getElementById('direct-translation-panel');
          if (panel) panel.remove();
        });
        footerElem.appendChild(closeBtn);
      }
      // 翻译完成后清理缓存
      if (isComplete) {
        this._lastStreamedText = '';
      }
      console.log('🚀 流式翻译面板已更新:', isComplete ? '完成' : '继续', `文本长度: ${partialText.length}`);
    }

    // 旧的超简单测试面板代码已移除

    // 获取当前状态
    getState() {
      return {
        isActive: this.isActive,
        isSelecting: this.isSelecting,
        isInitialized: this.isInitialized,
        currentElement: this.currentElement ? {
          tagName: this.currentElement.tagName,
          className: this.currentElement.className,
          id: this.currentElement.id
        } : null
      };
    }

    // 清理
    destroy() {
      this.deactivate();
      this.removeEventListeners();
      this.currentElement = null;
      this.settings = null;
    }
  }

  // 将类暴露到全局
  window.TranslatorElementSelector = TranslatorElementSelector;

  // 为了向后兼容，也暴露为ElementSelector（如果没有冲突）
  if (typeof window.ElementSelector === 'undefined') {
    window.ElementSelector = TranslatorElementSelector;
  }
}

// 延迟创建TranslatorElementSelector实例
function createElementSelector() {
  if (typeof window !== 'undefined' && !window.elementSelector) {
    try {
      window.elementSelector = new window.TranslatorElementSelector();
      console.log('TranslatorElementSelector 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorElementSelector 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 立即尝试创建，如果失败则延迟重试
if (!createElementSelector()) {
  setTimeout(() => {
    if (!createElementSelector()) {
      console.error('TranslatorElementSelector 实例创建最终失败');
    }
  }, 200);
}

// 🚀 全局重试函数 - 确保在全局范围内可用，移到条件块外面
window.translatorRetryTranslation = function () {
  console.log('🚀 全局重试函数被调用');

  // 找到当前活跃的ElementSelector实例
  if (window.elementSelector && typeof window.elementSelector.retryTranslation === 'function') {
    window.elementSelector.retryTranslation();
  } else {
    console.error('没有找到活跃的ElementSelector实例或重试方法');

    // 尝试手动创建实例
    if (createElementSelector() && window.elementSelector && typeof window.elementSelector.retryTranslation === 'function') {
      window.elementSelector.retryTranslation();
    } else {
      console.error('无法创建ElementSelector实例进行重试');
    }
  }
};

// 确保函数立即可用
console.log('🚀 全局重试函数已定义:', typeof window.translatorRetryTranslation); 