// 翻译器
if (typeof window.TranslatorEngine === 'undefined') {
  class TranslatorEngine {
    constructor() {
      this.constants = window.TRANSLATOR_CONSTANTS || {};
      this.storageManager = window.TranslatorStorageManagerInstance || null;
      this.uiOverlay = window.uiOverlay || null;
      
      this.settings = null;
      this.isTranslating = false;
      this.currentRequest = null;
      this.isInitialized = false;
      
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
      
      console.error('Translator: 依赖组件加载超时');
    }

    // 初始化
    async init() {
      try {
        this.settings = await this.storageManager.getSettings();
        this.bindEvents();
        this.isInitialized = true;
        console.log('Translator 初始化完成');
      } catch (error) {
        console.error('Translator 初始化失败:', error);
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

    // 翻译文本
    async translateText(text, targetLanguage = null) {
      console.log('translateText', text, targetLanguage);
      if (!text || text.trim().length === 0) {
        throw new Error('文本内容为空');
      }

      if (this.isTranslating) {
        throw new Error('正在翻译中，请稍后再试');
      }

      this.isTranslating = true;
      this.currentRequest = null;

      try {
        // 使用设置中的语言或传入的参数
        const settings = this.settings || await this.storageManager.getSettings();
        const finalTargetLanguage = targetLanguage || settings.targetLanguage || 'zh-CN';

        // 检查缓存
        const cacheKey = this.generateCacheKey(text, finalTargetLanguage);
        const cached = await this.storageManager.getCache(cacheKey);
        
        if (cached && settings.cacheResults) {
          console.log('使用缓存的翻译结果');
          return cached;
        }

        // 发送翻译请求到后台
        const response = await chrome.runtime.sendMessage({
          type: this.constants.MESSAGE_TYPES.TRANSLATE_TEXT,
          data: {
            text: text,
            targetLanguage: finalTargetLanguage
          }
        });

        if (!response || !response.success) {
          throw new Error(response?.error || '翻译请求失败');
        }

        const result = response.data;
        console.log('translateText result', result);
        
        // 缓存结果
        if (settings.cacheResults) {
          await this.storageManager.setCache(cacheKey, result);
        }

        return result;

      } catch (error) {
        console.error('翻译失败:', error);
        throw error;
      } finally {
        this.isTranslating = false;
        this.currentRequest = null;
      }
    }

    // 生成缓存键
    generateCacheKey(text, targetLanguage) {
      const hash = this.simpleHash(text);
      return `auto-${targetLanguage}-${hash}`;
    }

    // 简单哈希函数
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(36);
    }

    // 检测语言
    async detectLanguage(text) {
      if (!text || text.trim().length === 0) {
        return 'unknown';
      }

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'DETECT_LANGUAGE',
          data: { text: text }
        });

        if (response && response.success) {
          return response.data.language;
        }
      } catch (error) {
        console.error('语言检测失败:', error);
      }

      // 简单的语言检测回退
      return this.simpleLanguageDetection(text);
    }

    // 简单语言检测
    simpleLanguageDetection(text) {
      // 检测中文
      if (/[\u4e00-\u9fff]/.test(text)) {
        return 'zh-CN';
      }
      
      // 检测日文
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
        return 'ja';
      }
      
      // 检测韩文
      if (/[\uac00-\ud7af]/.test(text)) {
        return 'ko';
      }
      
      // 检测阿拉伯文
      if (/[\u0600-\u06ff]/.test(text)) {
        return 'ar';
      }
      
      // 检测俄文
      if (/[\u0400-\u04ff]/.test(text)) {
        return 'ru';
      }
      
      // 默认英文
      return 'en';
    }

    // 获取支持的语言列表
    getSupportedLanguages() {
      return this.constants.SUPPORTED_LANGUAGES;
    }

    // 获取语言名称
    getLanguageName(languageCode) {
      const language = this.constants.SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
      return language ? language.name : languageCode;
    }

    // 验证语言代码
    isValidLanguageCode(languageCode) {
      return this.constants.SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode);
    }

    // 获取翻译状态
    getTranslationStatus() {
      return {
        isTranslating: this.isTranslating,
        currentRequest: this.currentRequest
      };
    }

    // 取消翻译
    cancelTranslation() {
      if (this.currentRequest) {
        this.currentRequest.abort();
        this.currentRequest = null;
      }
      this.isTranslating = false;
    }

    // 获取翻译状态
    getTranslationState() {
      return {
        isTranslating: this.isTranslating,
        isInitialized: this.isInitialized,
        currentRequest: this.currentRequest ? {
          timestamp: this.currentRequest.timestamp || Date.now(),
          status: 'processing'
        } : null,
        settings: this.settings
      };
    }

    // 清理
    destroy() {
      this.cancelTranslation();
      this.settings = null;
    }
  }

  // 将类暴露到全局
  window.TranslatorEngine = TranslatorEngine;
}

// 延迟创建TranslatorEngine实例
function createTranslatorEngine() {
  if (typeof window !== 'undefined' && !window.translatorEngine) {
    try {
      window.translatorEngine = new window.TranslatorEngine();
      console.log('TranslatorEngine 实例已创建');
      return true;
    } catch (error) {
      console.error('TranslatorEngine 实例创建失败:', error);
      return false;
    }
  }
  return true;
}

// 立即尝试创建，如果失败则延迟重试
if (!createTranslatorEngine()) {
  setTimeout(() => {
    if (!createTranslatorEngine()) {
      console.error('TranslatorEngine 实例创建最终失败');
    }
  }, 300);
} 