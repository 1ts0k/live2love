# UI 设计规范

## 设计方向

产品气质是“可以安装到桌面的模拟小手机”。它不是普通聊天页，也不是纯酒馆式参数面板，而是一台安静、可信、能长期陪伴用户的虚拟手机。用户在这台手机里添加 AI 联系人、配置 API、打开聊天 App、收到通知、翻看相册和备忘录，像使用一部只属于自己的小设备。

核心关键词：

- 小手机
- 真实手机壳
- AI 联系人
- 私密感
- 可配置
- 沉浸聊天
- 本地优先
- 轻拟物
- 克制工具感
- 手账式索引
- 纸感留白
- 邮票与徽章隐喻

界面要让人感觉：我不是在调试一个大模型客户端，而是在给一台私人小手机接入灵魂。

## Register

本项目属于 product register。设计服务于真实任务：配置 API、管理角色、聊天、保存记录、切换会话、排查连接错误。拟真手机只是体验外壳，不能牺牲可读性、可恢复性和设置效率。

## 使用场景

夜里或通勤时，用户在手机上打开已安装的 PWA，环境光偏暗，手指单手操作，情绪更接近私密对话而不是办公。界面应以深色为主，降低眩光；设置页可以更清晰、更中性，方便用户检查 API 参数。

## 视觉基调

推荐使用：

- 深色微暖屏幕底色
- 暖纸色与墨黑成对的 light/dark 主题
- 低饱和手机系统色
- 低饱和地图色块：旧粉、雾蓝、鼠尾草绿、羊皮纸、淡紫
- 细边框、柔和内阴影、真实屏幕层级
- 简洁系统字体
- 聊天气泡、状态栏、Dock、锁屏、通知
- 手账式索引、邮票、徽章、资料卡和细线分隔
- 类 iOS 的轻拟物材质，但不做玻璃拟态堆叠

避免使用：

- 把旅行地图、邮票和城市概念照搬成产品内容
- 科幻霓虹 AI 面板
- 大面积紫蓝渐变
- 酒馆后台式密集参数墙
- 过度可爱或卡通化手机壳
- 大量装饰性动效
- 营销落地页式 hero
- 把所有功能塞进聊天页

## Atlas 手账风格转译

参考图的价值不在旅行主题，而在“私人索引本”的气质：内容像被用户慢慢收集、整理、盖章和归档。`live2love` 可以吸收这种气质，用在联系人、角色资料、记忆、桌面小组件和外观设置中；手机主屏幕里的应用入口名称使用 `聊天`。聊天流、API 表单和错误处理仍保持清楚、直接、可操作。

转译原则：

- Light 与 Dark 必须是同一套系统的两种纸面。Light 使用暖纸色、浅墨线和柔和阴影；Dark 使用近黑墨底、低亮边线和保留色相的暗版图块，不做简单反相。
- 视觉重点像一本安静的索引册。大标题、资料名、记忆篇章可以有更强的编辑感；按钮、表单、设置项、错误文案保持系统 UI 字体。
- 色块来自“地图”和“邮票”，不来自霓虹品牌色。旧粉、雾蓝、鼠尾草绿、羊皮纸、淡紫只用于头像、联系人封面、记忆卡、角色徽章和主题预览。
- 卡片更像收集物，不像营销卡。视觉图块可以使用圆角图像容器、细边框、微弱纸面阴影和简化符号；普通设置组仍保持紧凑、清晰、低装饰。
- 留白要有呼吸感，但不能牺牲任务效率。资料页、记忆页、空状态可以更松；Settings、API 配置、连接诊断必须维持明确分组和可扫读密度。
- 插画使用扁平、抽象、轻微手工感的符号：轮廓城市、徽章、首字母印章、关系标记、记忆碎片。不要使用写实照片、复杂插画或装饰性地图背景。
- 底部导航和工具按钮使用细线图标。当前项用小点、轻微墨色提升或短下划标记，不用高饱和填充。

## 色彩系统

色彩策略：Restrained。主界面使用带暖调的深色中性层，辅以一组手机系统色。颜色用于当前应用、角色状态、消息来源和错误状态，不用于无意义装饰。

### Dark Theme

```css
:root {
  color-scheme: dark;

  --bg: oklch(17% 0.012 260);
  --phone-shell: oklch(22% 0.013 260);
  --screen: oklch(19% 0.012 260);
  --surface: oklch(24% 0.013 260);
  --surface-raised: oklch(29% 0.014 260);
  --surface-sunken: oklch(14% 0.011 260);

  --text: oklch(94% 0.01 80);
  --text-muted: oklch(74% 0.018 80);
  --text-soft: oklch(56% 0.018 80);
  --line: oklch(36% 0.015 260);
  --line-soft: oklch(29% 0.012 260);

  --accent: oklch(72% 0.12 170);
  --accent-quiet: oklch(43% 0.055 170);
  --chat-user: oklch(61% 0.105 170);
  --chat-ai: oklch(31% 0.014 260);
  --danger: oklch(66% 0.15 25);
  --warning: oklch(75% 0.12 75);
  --success: oklch(70% 0.12 150);
  --info: oklch(72% 0.1 235);

  --surface-paper: oklch(23% 0.012 260);
  --surface-paper-raised: oklch(28% 0.013 260);
  --stamp-ink: oklch(91% 0.008 80);
  --stamp-line: oklch(40% 0.014 260);

  --archive-rose: oklch(62% 0.06 34);
  --archive-blue: oklch(61% 0.045 242);
  --archive-sage: oklch(61% 0.04 145);
  --archive-parchment: oklch(70% 0.03 86);
  --archive-lavender: oklch(62% 0.045 315);
  --archive-clay: oklch(58% 0.055 55);
}
```

### Light Theme

```css
[data-theme="light"] {
  color-scheme: light;

  --bg: oklch(93% 0.011 255);
  --phone-shell: oklch(88% 0.012 255);
  --screen: oklch(97% 0.008 85);
  --surface: oklch(94% 0.009 85);
  --surface-raised: oklch(98% 0.006 85);
  --surface-sunken: oklch(90% 0.012 85);

  --text: oklch(22% 0.014 260);
  --text-muted: oklch(44% 0.018 260);
  --text-soft: oklch(62% 0.016 260);
  --line: oklch(82% 0.012 260);
  --line-soft: oklch(89% 0.01 260);

  --accent: oklch(56% 0.12 170);
  --accent-quiet: oklch(86% 0.045 170);
  --chat-user: oklch(69% 0.11 170);
  --chat-ai: oklch(92% 0.009 260);
  --danger: oklch(58% 0.16 25);
  --warning: oklch(68% 0.13 75);
  --success: oklch(58% 0.13 150);
  --info: oklch(60% 0.11 235);

  --surface-paper: oklch(96% 0.011 85);
  --surface-paper-raised: oklch(99% 0.006 85);
  --stamp-ink: oklch(24% 0.014 260);
  --stamp-line: oklch(82% 0.012 260);

  --archive-rose: oklch(72% 0.055 34);
  --archive-blue: oklch(70% 0.045 242);
  --archive-sage: oklch(72% 0.04 145);
  --archive-parchment: oklch(86% 0.035 86);
  --archive-lavender: oklch(74% 0.045 315);
  --archive-clay: oklch(68% 0.055 55);
}
```

### 色彩规则

- 深色主题是默认体验，适合长时间私密聊天。
- Light Theme 主要服务于白天、户外和设置检查。
- 用户消息使用 `--chat-user`，AI 消息使用 `--chat-ai`，不要把双方都做成同等强调。
- API 错误、余额不足、模型不可用必须使用明确的语义色和文案。
- API Key、Base URL、模型名等敏感设置不使用高亮装饰，保持工具化和可信。
- `--archive-*` 只服务于联系人、角色徽章、记忆索引、桌面小组件和外观预览，不作为主要 CTA 色。
- Dark Theme 中的手账色块要保留色相但降低亮度，避免在深色聊天环境里发光。
- Light Theme 不使用纯白纸面，所有纸感容器都应带轻微暖色或墨色偏移。

## 字体系统

```css
:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", system-ui, sans-serif;
  --font-editorial: "Noto Serif SC", "Songti SC", "STSong", Georgia, serif;
  --font-mono: "SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace;
}
```

使用规则：

- 全产品使用系统 sans，模拟真实手机系统。
- 不使用 display font 作为按钮、标签、设置项或聊天内容字体。
- `--font-editorial` 只用于 App 级标题、联系人姓名、角色资料标题、记忆篇章标题和少量空状态短句。
- 如果中文衬线字体在设备上渲染粗糙，回退到 `--font-ui`，不要为了风格牺牲可读性。
- API 参数、模型 ID、错误码使用 `--font-mono`。
- 长文本行宽控制在 65ch 以内，聊天气泡更短，避免满宽段落。

### 字级

```css
:root {
  --text-xl: 28px;
  --text-lg: 22px;
  --text-md: 17px;
  --text-sm: 14px;
  --text-xs: 12px;
  --text-micro: 11px;
}
```

建议：

- 聊天正文：16px 至 17px。
- 设置标签：13px 至 14px。
- 状态栏与底部 App label：10px 至 12px。
- 页面标题使用 22px 至 28px，不做 hero 式大标题。
- 索引式 micro label 使用 10px 至 12px、全大写英文或短中文标签，CSS `letter-spacing` 保持 0，靠留白和字重建立节奏。

## 手机壳与屏幕框架

移动端以真实 viewport 作为手机屏幕，不再额外包一层巨大模拟器边框。桌面端可以居中呈现手机设备框，最大宽度 430px，高度接近 860px。

```css
:root {
  --phone-max-width: 430px;
  --phone-radius: 34px;
  --screen-radius: 28px;
  --safe-x: 18px;
  --safe-top: 14px;
  --safe-bottom: 18px;
  --app-gap: 14px;
  --panel-gap: 12px;
}
```

布局规则：

- 顶部状态栏始终保留时间、网络、API 状态或离线状态。
- 主要 App 区域遵循手机系统层级：锁屏、桌面、应用、会话。
- 底部 Dock 固定 3 到 5 个核心入口：聊天、联系人、角色、设置、记忆。
- 聊天页优先保证输入框、最新消息和返回路径可见。
- 设置页允许更高信息密度，但必须分组清晰。
- 桌面端模拟手机外壳不能遮挡调试信息和错误提示。
- 资料页和记忆页可以采用“封面图块在上、索引信息在下”的纵向节奏，类似手账内页。
- 桌面小组件可以像最近收集的卡片或联系人票夹，但必须点击后进入明确 App 路径。

## 圆角与边框

```css
:root {
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  --border-thin: 1px solid var(--line);
}
```

使用规则：

- 手机外壳：28px 至 34px。
- App icon：20px 至 24px。
- 聊天气泡：18px 至 22px，尾部可省略，避免廉价气泡感。
- 设置项和列表行：10px 至 14px。
- 头像封面、记忆封面、主题预览等图像容器：14px 至 18px。
- 普通信息卡和工具面板默认 8px，只有系统列表组或输入容器需要贴合手机圆角时可到 10px 至 12px。
- Cards 不超过 8px 的规则不适用于手机外壳、图标、气泡和视觉封面，但普通工具面板不要过圆。

## 阴影与层级

```css
:root {
  --shadow-phone:
    0 30px 80px oklch(6% 0.02 260 / 0.5),
    inset 0 1px 0 oklch(100% 0 0 / 0.08);
  --shadow-raised:
    0 12px 32px oklch(6% 0.02 260 / 0.24),
    inset 0 1px 0 oklch(100% 0 0 / 0.04);
  --shadow-press:
    inset 0 2px 8px oklch(6% 0.02 260 / 0.28);
}
```

使用规则：

- 手机壳可以有明显物理阴影。
- App 内部主要靠背景层级和边框，不靠厚重卡片阴影。
- 输入框和底部工具条允许轻微 raised 效果，强调可操作。
- 通知浮层使用短暂阴影，不做玻璃模糊堆叠。
- Light Theme 的手账图块可以使用极轻纸面阴影，Dark Theme 的手账图块主要依赖边框和内阴影。
- 资料封面和邮票式徽章允许轻微错层，但不能出现多层玻璃叠卡。

## 核心信息架构

### 锁屏

- 显示时间、日期、最近一条 AI 通知。
- 支持从通知进入对应会话。
- 锁屏不展示 API Key、系统提示词或敏感错误细节。
- 可显示离线、API 未配置、正在同步等状态。

### 桌面

- App icon 代表功能，而不是营销入口。
- 推荐默认 App：Messages、Contacts、Characters、Memory、Settings。
- 角色可以像联系人一样出现在桌面小组件里。
- 最近联系人、未读会话和记忆摘要可以做成小型索引卡，像用户私人手机里的“最近收集”。
- 小组件里的插画只表达状态和归属，例如首字母印章、关系徽章、记忆碎片，不展示复杂背景。
- 不要做复杂的仿系统设置迷宫，常用操作最多两层可达。

### Messages

- 会话列表显示联系人头像、名称、最后消息、时间、未读状态。
- 聊天页支持流式回复、停止生成、重试、编辑上一条、重新生成。
- 消息失败必须可重试，并保留失败原因入口。
- 输入区支持文本、快捷语气、角色内心备注或系统备注，但高级功能默认收起。

### Contacts

- 联系人是 AI 角色的可见外壳。
- 联系人详情包含头像、称呼、简介、关系、默认模型、提示词入口、记忆入口。
- 角色编辑应像编辑联系人，不像填写数据库表。
- 联系人详情可以采用资料封面、首字母印章、关系徽章和“Known for”式短标签，帮助角色更像可长期相处的人。
- 联系人列表保持可扫读，不把每个联系人都做成大插画卡；封面感主要用于详情页和桌面小组件。
- 支持导入角色卡，但导入后要转译为本产品自己的联系人结构。

### Settings

- API 配置是核心路径：Provider、Base URL、API Key、Model、Temperature、Max Tokens、上下文策略。
- 支持测试连接，测试结果必须明确说明成功、认证失败、模型不可用、网络失败。
- API Key 默认隐藏，支持一键清除。
- 高级参数分组收起，避免吓到新用户。
- Appearance、主题和手机壳外观可以使用横向预览卡，像参考图中的地图样式选择；API 配置区不使用这种装饰预览。
- 设置分组采用安静列表：左侧线性图标，中间主标签，右侧状态或 chevron。每组之间用纸面间距和细线分隔。

### Memory

- 记忆不是纯日志，而是用户和 AI 关系的长期上下文。
- 可分为固定人设、近期摘要、重要事件、禁忌和偏好。
- 允许用户查看、编辑、删除记忆。
- 自动生成的记忆必须标明来源和时间。
- 记忆可以像私人索引册：按联系人、时间、主题或关系阶段分组，使用小号编号、来源标记和低饱和色条。
- 自动摘要不要做成漂亮但含糊的“回忆卡”，必须保留来源会话和编辑入口。

## 组件规范

### 状态栏

- 左侧时间，右侧网络、电量、API 状态。
- API 状态建议使用小点或短标签：Ready、Offline、Key、Error。
- 点击 API 状态进入连接诊断，而不是弹出不可操作提示。

### App Icon

- 使用圆角方形图标和简洁符号。
- 图标色彩要可区分，但整体低饱和。
- Icon label 最多 8 个中文字符或 12 个英文字符。
- 当前 MVP 不需要写实图标和复杂插画。

### 资料封面与印章

- 用于联系人详情、角色资料、记忆篇章和主题预览，不用于 API 表单。
- 封面图块使用扁平色块和线性符号，表达角色气质、关系状态或记忆主题。
- 首字母印章、关系徽章、模型徽章可以作为辅助信息，尺寸小、边框细、色彩低饱和。
- 徽章文案要短，例如 Close、Muse、Local、OpenRouter、Memory，不做长句。
- 印章和徽章不能遮挡主标题、返回按钮、状态栏或关键操作。

### 索引卡与小组件

- 适用于桌面最近会话、最近记忆、联系人小组件和空状态推荐。
- 卡片结构优先为“视觉图块加下方元信息”，不要把所有文字压进图块内部。
- 元信息包括名称、短描述、时间、状态、来源，最多两行。
- 可用细线、编号、小点或短分隔符建立索引感；不要使用厚侧边色条。
- 空状态可以像一张待填写的索引卡，但必须提供明确下一步，例如添加联系人、配置 API、开始聊天。

### 聊天气泡

- 用户消息右侧，AI 消息左侧。
- AI 消息旁保留头像或首字母标识。
- 长按消息打开操作菜单：复制、编辑、重试、删除、保存为记忆。
- 流式输出时只显示轻量状态，不让整页跳动。

### 输入栏

- 常驻底部，避开安全区。
- 主要动作为发送，辅助动作为附件、语气、更多。
- 发送中变为停止按钮。
- 空输入时发送按钮 disabled，不用红色或警告色。

### 设置表单

- 使用原生感输入控件、segmented control、switch、slider、select。
- 每个字段都要有帮助文案或示例值，尤其是 Base URL 和模型名。
- 密钥字段提供显示、复制、清除动作。
- 测试连接按钮必须显示 loading 和结果。

## 动效规范

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 260ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

推荐动效：

- App 打开：图标轻微缩放到应用页面，180ms 至 260ms。
- 会话切换：水平滑入或淡入，保持手机系统感。
- 消息发送：气泡从输入区轻微上移并淡入。
- 流式回复：内容自然增长，不做逐字闪烁。
- 锁屏通知：从顶部短暂下滑。

避免动效：

- 弹跳动画
- 无限呼吸灯
- 大面积视差
- 装饰性 loading
- 影响输入延迟的页面转场

## 可访问性与边界状态

所有可交互组件至少需要：

- Default
- Hover
- Focus
- Active
- Disabled
- Loading
- Error

状态规则：

- Focus 必须可见，键盘用户能完成配置和聊天。
- 对比度优先于拟真效果，文本不能压在复杂背景上。
- 离线状态要允许查看历史记录。
- API 未配置时，聊天页引导去 Settings，不展示空白聊天框。
- 请求失败时保留用户输入，禁止吞消息。
- 长会话要有加载更多和上下文摘要提示。

## 实现起点

```css
:root {
  color-scheme: dark;

  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", system-ui, sans-serif;
  --font-editorial: "Noto Serif SC", "Songti SC", "STSong", Georgia, serif;
  --font-mono: "SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace;

  --bg: oklch(17% 0.012 260);
  --phone-shell: oklch(22% 0.013 260);
  --screen: oklch(19% 0.012 260);
  --surface: oklch(24% 0.013 260);
  --surface-raised: oklch(29% 0.014 260);
  --surface-sunken: oklch(14% 0.011 260);

  --text: oklch(94% 0.01 80);
  --text-muted: oklch(74% 0.018 80);
  --text-soft: oklch(56% 0.018 80);
  --line: oklch(36% 0.015 260);
  --line-soft: oklch(29% 0.012 260);

  --accent: oklch(72% 0.12 170);
  --accent-quiet: oklch(43% 0.055 170);
  --chat-user: oklch(61% 0.105 170);
  --chat-ai: oklch(31% 0.014 260);
  --danger: oklch(66% 0.15 25);
  --warning: oklch(75% 0.12 75);
  --success: oklch(70% 0.12 150);
  --info: oklch(72% 0.1 235);

  --surface-paper: oklch(23% 0.012 260);
  --surface-paper-raised: oklch(28% 0.013 260);
  --stamp-ink: oklch(91% 0.008 80);
  --stamp-line: oklch(40% 0.014 260);

  --archive-rose: oklch(62% 0.06 34);
  --archive-blue: oklch(61% 0.045 242);
  --archive-sage: oklch(61% 0.04 145);
  --archive-parchment: oklch(70% 0.03 86);
  --archive-lavender: oklch(62% 0.045 315);
  --archive-clay: oklch(58% 0.055 55);

  --phone-max-width: 430px;
  --phone-radius: 34px;
  --screen-radius: 28px;
  --safe-x: 18px;
  --safe-top: 14px;
  --safe-bottom: 18px;
  --app-gap: 14px;
  --panel-gap: 12px;

  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 260ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```
