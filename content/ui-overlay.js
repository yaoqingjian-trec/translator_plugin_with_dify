// UI叠加层管理器
if (typeof window.TranslatorUIOverlay === 'undefined') {
  class TranslatorUIOverlay {
    constructor() {
      this.constants = window.TRANSLATOR_CONSTANTS || {};
      this.overlay = null;
      this.tooltip = null;
      this.translationPanel = null;
      this.isVisible = false;
      this.currentElement = null;
      this.currentTranslation = null;
      
      this.init();
    }

    // 国际化翻译函数
    t(key, substitutions) {
      if (typeof window.t === 'function') {
        return window.t(key, substitutions);
      }
      // 如果i18n还没有加载，返回key作为fallback
      return key;
    }

    // 初始化
    init() {
      try {
        this.createOverlay();
        this.createTooltip();
        this.createTranslationPanel();
        this.bindEvents();
      } catch (error) {
        console.error('UIOverlay 初始化失败:', error);
      }
    }

    // 创建遮罩层
    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.className = 'translator-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.1);
        z-index: 1000000;
        pointer-events: none;
        display: none;
      `;
      
      // 创建提示
      const hint = document.createElement('div');
      hint.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        font-family: Arial, sans-serif;
        z-index: 1000001;
        pointer-events: auto;
      `;
      hint.innerHTML = `
        <div>${this.t('click_element_to_translate')}</div>
        <div style="font-size: 12px; margin-top: 5px; opacity: 0.8;">
          ${this.t('press_esc_to_cancel')} | ${this.t('shortcut_hint')}
        </div>
      `;
      
      this.overlay.appendChild(hint);
      document.body.appendChild(this.overlay);
    }

    // 创建提示框
    createTooltip() {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'translator-tooltip';
      this.tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 1000002;
        pointer-events: none;
        display: none;
        white-space: nowrap;
      `;
      
      document.body.appendChild(this.tooltip);
    }

    // 创建翻译面板
    createTranslationPanel() {
      this.translationPanel = document.createElement('div');
      this.translationPanel.className = 'translator-panel';
      this.translationPanel.style.cssText = `
        position: fixed;
        width: 400px;
        max-height: 90vh;
        background: #ffffff;
        border: 3px solid #007bff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 2147483647;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        opacity: 1;
        visibility: visible;
      `;
      
      document.body.appendChild(this.translationPanel);
      // 面板已创建
    }

    // 绑定事件
    bindEvents() {
      // 监听ESC键
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          // 优先关闭翻译面板
          if (this.translationPanel && this.translationPanel.style.display !== 'none') {
            this.hideTranslationPanel();
          }
          // 然后关闭选择器遮罩
          else if (this.isVisible) {
            this.hide();
          }
        }
      });
      
      // 监听点击遮罩层取消选择
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.hide();
        }
      });
    }

    // 显示遮罩层
    show() {
      if (this.overlay) {
        this.overlay.style.display = 'block';
        this.isVisible = true;
        
        // 禁用页面滚动
        document.body.style.overflow = 'hidden';
      }
    }

    // 隐藏遮罩层
    hide() {
      if (this.overlay) {
        this.overlay.style.display = 'none';
        this.isVisible = false;
        
        // 恢复页面滚动
        document.body.style.overflow = '';
      }
      
      this.hideTooltip();
      this.hideTranslationPanel();
    }

    // 显示提示框
    showTooltip(element, text) {
      if (!this.tooltip) return;
      
      this.tooltip.textContent = text;
      this.tooltip.style.display = 'block';
      
      // 计算位置
      const rect = element.getBoundingClientRect();
      const tooltipRect = this.tooltip.getBoundingClientRect();
      
      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = rect.top - tooltipRect.height - 5;
      
      // 边界检查
      if (left < 5) left = 5;
      if (left + tooltipRect.width > window.innerWidth - 5) {
        left = window.innerWidth - tooltipRect.width - 5;
      }
      
      if (top < 5) {
        top = rect.bottom + 5;
      }
      
      this.tooltip.style.left = left + 'px';
      this.tooltip.style.top = top + 'px';
    }

    // 隐藏提示框
    hideTooltip() {
      if (this.tooltip) {
        this.tooltip.style.display = 'none';
      }
    }

    // 显示翻译面板
    showTranslationPanel(element, originalText, translatedText, isComplete = false, isError = false) {
      // 显示翻译面板
      
      if (!this.translationPanel) {
        console.error('翻译面板不存在！尝试重新创建...');
        this.createTranslationPanel();
        if (!this.translationPanel) {
          console.error('翻译面板创建失败！');
          return;
        }
      }
      
      this.currentElement = element;
      this.currentTranslation = { original: originalText, translated: translatedText };
      
      // 根据状态生成不同的内容
      let contentHTML = '';
      let buttonsHTML = '';
      
      if (isError) {
        // 错误状态
        contentHTML = `
          <div style="padding: 16px; border-bottom: 1px solid #eee;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #dc3545;">❌ 翻译失败</h3>
            <div style="margin-bottom: 8px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">原文:</div>
              <div style="font-size: 14px; color: #333; line-height: 1.4;">${originalText}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #dc3545; margin-bottom: 4px;">错误信息:</div>
              <div style="font-size: 13px; color: #dc3545; line-height: 1.4;">${translatedText}</div>
            </div>
          </div>
        `;
        buttonsHTML = `
          <div style="padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="translator-btn translator-btn-retry" style="padding: 6px 12px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🔄 重试</button>
            <button class="translator-btn translator-btn-close" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">❌ 关闭</button>
          </div>
        `;
      } else if (isComplete) {
        // 翻译完成状态
        contentHTML = `
          <div style="padding: 16px; border-bottom: 1px solid #eee;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #28a745;">✅ 翻译完成</h3>
            <div style="margin-bottom: 8px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 原文:</div>
              <div style="font-size: 14px; color: #333; line-height: 1.4; background: #f8f9fa; padding: 8px; border-radius: 4px;">${originalText}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">🌍 译文:</div>
              <div style="font-size: 14px; color: #007bff; line-height: 1.4; font-weight: 500; background: #e3f2fd; padding: 8px; border-radius: 4px;">${translatedText}</div>
            </div>
          </div>
        `;
        buttonsHTML = `
          <div style="padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="translator-btn translator-btn-copy" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">📋 复制</button>
            <button class="translator-btn translator-btn-apply" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">✏️ 应用</button>
            <button class="translator-btn translator-btn-retry" style="padding: 6px 12px; background: #ffc107; color: #212529; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🔄 重试</button>
            <button class="translator-btn translator-btn-close" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">❌ 关闭</button>
          </div>
        `;
      } else {
        // 翻译中状态
        contentHTML = `
          <div style="padding: 16px; border-bottom: 1px solid #eee;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #007bff;">🔄 正在翻译...</h3>
            <div style="margin-bottom: 8px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 原文:</div>
              <div style="font-size: 14px; color: #333; line-height: 1.4; background: #f8f9fa; padding: 8px; border-radius: 4px;">${originalText}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding: 16px; background: #f0f8ff; border-radius: 4px;">
              <div class="translator-spinner" style="width: 20px; height: 20px; border: 2px solid #e3f2fd; border-top: 2px solid #007bff; border-radius: 50%; animation: translator-spin 1s linear infinite;"></div>
              <div style="font-size: 13px; color: #007bff;">正在翻译中，请稍候...</div>
            </div>
          </div>
        `;
        buttonsHTML = `
          <div style="padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end;">
            <button class="translator-btn translator-btn-close" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">❌ 关闭</button>
          </div>
        `;
      }
      
      this.translationPanel.innerHTML = contentHTML + buttonsHTML;
      
      // 绑定按钮事件
      const copyBtn = this.translationPanel.querySelector('.translator-btn-copy');
      const applyBtn = this.translationPanel.querySelector('.translator-btn-apply');
      const retryBtn = this.translationPanel.querySelector('.translator-btn-retry');
      const closeBtn = this.translationPanel.querySelector('.translator-btn-close');
      
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this.copyTranslation());
      }
      
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this.applyTranslation());
      }
      
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.retryTranslation());
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideTranslationPanel());
      }
      
      // 智能定位
      this.positionTranslationPanel(element);
      
      // 显示面板
      this.translationPanel.style.display = 'block';
      
      // 面板已显示
      
      // 确保面板完全可见
      this.translationPanel.style.opacity = '1';
      this.translationPanel.style.visibility = 'visible';
      
      // 面板完全显示
      
      // 添加渐入动画
      this.translationPanel.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        this.translationPanel.style.opacity = '1';
      }, 10);
    }

    // 智能定位翻译面板
    positionTranslationPanel(element) {
      const rect = element.getBoundingClientRect();
      const panelWidth = 400;
      const panelHeight = 250;
      
      // 智能定位翻译面板
      
      // 默认位置：元素右下方
      let left = rect.right + 10;
      let top = rect.bottom + 10;
      
      // 检查右侧空间
              if (left + panelWidth > window.innerWidth) {
          left = rect.left - panelWidth - 10; // 放在左侧
          if (left < 0) {
            left = 10; // 贴近左边缘
          }
        }
        
        // 检查下方空间
        if (top + panelHeight > window.innerHeight) {
          top = rect.top - panelHeight - 10; // 放在上方
          if (top < 0) {
            top = window.innerHeight - panelHeight - 10; // 贴近底部
          }
        }
        
        // 确保在视窗内
        left = Math.max(10, Math.min(left, window.innerWidth - panelWidth - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - panelHeight - 10));
      
      this.translationPanel.style.left = left + 'px';
      this.translationPanel.style.top = top + 'px';
    }

    // 重试翻译
    async retryTranslation() {
      if (this.currentElement && this.currentTranslation) {
        // 显示翻译中状态
        this.showTranslationPanel(this.currentElement, this.currentTranslation.original, '正在重新翻译...');
        
        // 获取当前语言设置
        let sourceLanguage = 'auto';
        let targetLanguage = 'zh-CN';
        
        try {
          // 尝试从storage获取语言设置
          const result = await chrome.storage.sync.get('translator_settings');
          if (result.translator_settings) {
            sourceLanguage = result.translator_settings.sourceLanguage || 'auto';
            targetLanguage = result.translator_settings.targetLanguage || 'zh-CN';
          }
        } catch (e) {
          console.log('获取语言设置失败，使用默认设置');
        }
        
        // 发送重试翻译请求
        try {
          chrome.runtime.sendMessage({
            type: 'translate_text',
            data: {
              text: this.currentTranslation.original,
              sourceLanguage: sourceLanguage,
              targetLanguage: targetLanguage
            }
          }).then(response => {
            if (response && response.success) {
              this.showTranslationPanel(this.currentElement, this.currentTranslation.original, response.data.translatedText, true);
            } else {
              this.showTranslationPanel(this.currentElement, this.currentTranslation.original, response?.error || '重试翻译失败', false, true);
            }
          }).catch(error => {
            this.showTranslationPanel(this.currentElement, this.currentTranslation.original, '重试翻译失败: ' + error.message, false, true);
          });
        } catch (error) {
          this.showTranslationPanel(this.currentElement, this.currentTranslation.original, '重试翻译失败: ' + error.message, false, true);
        }
      }
    }

    // 隐藏翻译面板
    hideTranslationPanel() {
      if (this.translationPanel) {
        // 添加渐出动画
        this.translationPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        this.translationPanel.style.opacity = '0';
        this.translationPanel.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          this.translationPanel.style.display = 'none';
          this.currentElement = null;
          this.currentTranslation = null;
        }, 300);
      }
    }

    // 复制翻译结果
    copyTranslation() {
      if (this.currentTranslation) {
        navigator.clipboard.writeText(this.currentTranslation.translated).then(() => {
          this.showNotification('翻译结果已复制到剪贴板');
        }).catch(() => {
          this.showNotification('复制失败，请手动复制');
        });
      }
    }

    // 应用翻译结果
    applyTranslation() {
      if (this.currentElement && this.currentTranslation) {
        // 尝试替换元素文本
        if (this.currentElement.tagName === 'INPUT' || this.currentElement.tagName === 'TEXTAREA') {
          this.currentElement.value = this.currentTranslation.translated;
        } else {
          this.currentElement.textContent = this.currentTranslation.translated;
        }
        
        this.showNotification('翻译已应用到元素');
        this.hideTranslationPanel();
      }
    }

    // 显示通知
    showNotification(message, duration = 3000) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000004;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        white-space: pre-wrap;
        line-height: 1.4;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      // 指定时间后自动移除
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, duration);
    }

    // 高亮元素
    highlightElement(element) {
      if (!element) return;
      
      // 移除之前的高亮
      this.removeHighlight();
      
      // 添加高亮样式
      element.style.outline = '2px solid #007bff';
      element.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
      element.setAttribute('data-translator-highlighted', 'true');
    }

    // 移除高亮
    removeHighlight() {
      const highlighted = document.querySelector('[data-translator-highlighted="true"]');
      if (highlighted) {
        highlighted.style.outline = '';
        highlighted.style.backgroundColor = '';
        highlighted.removeAttribute('data-translator-highlighted');
      }
    }

    // 设置鼠标样式
    setCursor(cursor) {
      document.body.style.cursor = cursor;
    }

    // 恢复默认鼠标样式
    resetCursor() {
      document.body.style.cursor = 'default';
    }



    // 销毁所有UI元素和清理状态
    destroy() {
      // 隐藏遮罩
      this.hide();
      
      // 隐藏翻译面板
      this.hideTranslationPanel();
      
      // 移除高亮
      this.removeHighlight();
      
      // 恢复鼠标样式
      this.resetCursor();
      
      // 隐藏提示框
      this.hideTooltip();
      
      // 清理所有翻译器相关的DOM元素
      const translatorElements = document.querySelectorAll('[class*="translator-"], [data-translator-highlighted]');
      translatorElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      
      // 重置状态
      this.overlayElement = null;
      this.tooltipElement = null;
      this.translationPanel = null;
      this.currentElement = null;
      this.currentTranslation = null;
      
      console.log('TranslatorUIOverlay 已销毁');
    }
  }

  // 将类暴露到全局
  window.TranslatorUIOverlay = TranslatorUIOverlay;
  
  // 为了向后兼容，也暴露为UIOverlay（如果没有冲突）
  if (typeof window.UIOverlay === 'undefined') {
    window.UIOverlay = TranslatorUIOverlay;
  }
}

// 延迟创建TranslatorUIOverlay实例
function createUIOverlay() {
  if (typeof window !== 'undefined' && !window.uiOverlay) {
    try {
      window.uiOverlay = new window.TranslatorUIOverlay();
      console.log('TranslatorUIOverlay 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorUIOverlay 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 立即尝试创建，如果失败则延迟重试
if (!createUIOverlay()) {
  setTimeout(() => {
    if (!createUIOverlay()) {
      console.error('TranslatorUIOverlay 实例创建最终失败');
    }
  }, 150);
}

// 添加CSS动画
if (!document.querySelector('#translator-styles')) {
  const style = document.createElement('style');
  style.id = 'translator-styles';
  style.textContent = `
    @keyframes translator-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .translator-spinner {
      animation: translator-spin 1s linear infinite;
    }
    
    .translator-btn:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
    
    .translator-btn:active {
      transform: scale(0.95);
    }
    
    .translator-panel {
      animation: fadeIn 0.3s ease-out;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      backdrop-filter: blur(8px);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
} 