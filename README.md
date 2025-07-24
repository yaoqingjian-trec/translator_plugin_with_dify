# 智能翻译选择器 Chrome 插件

类似影刀RPA的Chrome浏览器插件，支持手动选择页面元素进行翻译。默认使用硅基流动API，备选Dify API。

## 功能特点

- 🎯 **元素选择器**: 类似影刀RPA的精准元素选择功能
- 🔄 **双API支持**: 主用硅基流动API，备选Dify API，自动降级
- 🌐 **智能翻译**: 支持多语言自动检测和翻译
- 💾 **结果缓存**: 本地缓存翻译结果，提高性能
- 🎨 **现代UI**: 美观的界面设计，支持深色模式
- ⚡ **快捷操作**: 支持快捷键和右键菜单
- 📱 **响应式**: 适配不同屏幕尺寸

## 安装方法

### 1. 下载代码
```bash
git clone https://github.com/your-username/translator_plugin_with_dify.git
cd translator_plugin_with_dify
```

### 2. 创建图标文件
在 `assets/icons/` 目录下创建以下图标文件：
- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

建议使用翻译相关的图标，如地球、翻译符号等。

### 3. 加载到Chrome
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 配置说明

### 硅基流动API配置
1. 访问 [硅基流动官网](https://siliconflow.cn) 注册账号
2. 获取API密钥
3. 在插件设置中配置API密钥

### Dify API配置
1. 访问 [Dify官网](https://dify.ai) 注册账号
2. 创建翻译应用并获取API密钥
3. 在插件设置中配置API密钥和基础URL

## 使用方法

### 基本使用
1. 点击浏览器工具栏中的插件图标
2. 点击"启动选择器"按钮
3. 将鼠标悬停在要翻译的元素上（会显示蓝色高亮）
4. 点击选中元素
5. 等待翻译结果显示在弹窗中

### 快捷键
- `Ctrl+Shift+T`: 切换元素选择器
- `Ctrl+Shift+C`: 清空缓存

### 右键菜单
- 选中文本后右键可直接翻译
- 页面右键菜单中有"启动选择器"选项

## 项目结构

```
translator_plugin_with_dify/
├── manifest.json              # 插件清单文件
├── background/               # 后台脚本
│   ├── background.js        # 主后台脚本
│   └── api-manager.js       # API管理器
├── content/                 # 内容脚本
│   ├── content.js          # 内容脚本主文件
│   ├── element-selector.js # 元素选择器
│   ├── translator.js       # 翻译器
│   └── ui-overlay.js       # UI叠加层
├── popup/                  # 弹窗界面
│   ├── popup.html         # 弹窗HTML
│   ├── popup.js          # 弹窗逻辑
│   └── popup.css         # 弹窗样式
├── options/              # 设置页面
│   ├── options.html     # 设置页面HTML
│   ├── options.js      # 设置页面逻辑
│   └── options.css     # 设置页面样式
├── assets/             # 资源文件
│   ├── icons/         # 图标文件
│   └── css/          # 样式文件
│       └── content.css # 内容脚本样式
├── utils/             # 工具函数
│   ├── constants.js   # 常量定义
│   ├── storage.js     # 存储管理
│   └── i18n.js        # 国际化
└── README.md          # 项目说明
```

## 开发说明

### 技术栈
- **Manifest V3**: 最新的Chrome扩展API
- **Vanilla JavaScript**: 原生JavaScript实现
- **Chrome Storage API**: 数据存储
- **Fetch API**: 网络请求

### 关键特性
- **元素选择**: 实现了类似影刀RPA的精准元素选择功能
- **双API架构**: 主用硅基流动API，备选Dify API
- **智能降级**: API调用失败时自动切换备用API
- **缓存机制**: 本地缓存翻译结果，避免重复请求
- **响应式设计**: 适配不同屏幕尺寸和设备

### 自定义配置
插件支持丰富的自定义配置：
- API选择和配置
- 界面主题和颜色
- 快捷键启用/禁用
- 缓存设置
- 高级参数调整

## 问题排查

### 常见问题
1. **选择器不工作**: 检查页面是否支持内容脚本注入
2. **翻译失败**: 检查API密钥是否正确配置
3. **界面异常**: 尝试刷新页面或重启浏览器
4. **性能问题**: 清空缓存或调整缓存设置

### 调试方法
1. 开启调试模式（在高级设置中）
2. 查看浏览器控制台日志
3. 检查扩展程序页面的错误信息

## 更新日志

### v1.0.0
- 初始版本发布
- 支持元素选择和翻译
- 集成硅基流动API和Dify API
- 实现缓存机制
- 提供完整的设置界面

## 许可证

MIT License

## 贡献

欢迎提交Issues和Pull Requests来改进这个项目。

## 联系方式

如有问题或建议，请在GitHub上创建Issue。 