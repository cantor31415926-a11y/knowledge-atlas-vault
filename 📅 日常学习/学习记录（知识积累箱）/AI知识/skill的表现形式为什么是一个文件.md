

# skill不应该是提示词的组合吗，不应该是markdown的是形式吗。但为什么GitHub上的skill是文件的形式，要安装才能使用？
你这个理解**对了一半**。关键点是：

> **Skill 可以包含提示词，但 Skill 不等于“提示词的组合”。**  
> **Markdown 只是 Skill 的一种“说明/定义格式”，而 GitHub 上看到的文件夹才是 Skill 的“完整软件包”。**

可以把它理解成三个层级。

### 1. 提示词 Prompt：告诉 AI「这一次怎么做」

比如：

```
你是一个金融老师。

要求：
1. 用费曼学习法解释
2. 先说定义
3. 再举生活例子
4. 最后给一道练习题
```

这就是一个 Prompt。

它的特点是：**你复制进去，AI 就执行一次。**

---

### 2. `SKILL.md`：告诉 AI「以后遇到这类任务，都按这套 SOP 做」

例如你做一个：

```
financial-teacher/
└── SKILL.md
```

里面可能写：

```
# Financial Teacher Skill

## Goal
帮助金融初学者理解金融概念。

## Workflow
1. 判断用户知识水平
2. 给出一句话定义
3. 使用生活类比
4. 使用金融案例
5. 给出公式
6. 给一道费曼问题

## Output Format
- Definition
- Analogy
- Example
- Formula
- Feynman Question
```

所以你之前说：

> Skill 是不是一组 Prompt？

可以粗略这么理解。

但更准确应该是：

> **Skill = 一份可复用的 AI 工作说明书 / SOP。**

Prompt 更像：

> 「现在帮我炒一个西红柿炒蛋。」

Skill 更像：

> 「这是我们餐厅做西红柿炒蛋的标准操作手册，以后有人点这道菜都按这个流程做。」

---

### 3. GitHub 上为什么 Skill 经常是「文件夹」？

因为实际 Skill 往往不只有一个 Markdown。

比如：

```
my-skill/
│
├── SKILL.md
│
├── references/
│   ├── finance_rules.md
│   └── examples.md
│
├── scripts/
│   └── calculate.py
│
├── templates/
│   └── report_template.md
│
└── assets/
    └── logo.png
```

这时候：

**`SKILL.md` 是大脑里的“说明书”。**

其他文件则是它干活时要用的：

- `references/`：参考资料
- `scripts/`：Python / JS 等程序
- `templates/`：输出模板
- `assets/`：图片等资源

所以 GitHub 展示的是：

> **一个完整 Skill Package（技能包）**

而不是单独的一段 Prompt。

---

## 那为什么还要“安装”？

这其实是你最容易困惑的地方。

**安装 Skill 通常不是像安装微信一样“安装一个程序”。**

它本质上经常只是：

> **把 Skill 文件夹放到 AI 工具规定的位置，让 AI 能发现它。**

例如假设某个 AI 工具规定：

```
~/.ai/skills/
```

你下载 GitHub 上：

```
financial-analysis/
    SKILL.md
    scripts/
    references/
```

安装后可能变成：

```
~/.ai/skills/
└── financial-analysis/
    ├── SKILL.md
    ├── scripts/
    └── references/
```

AI 启动以后扫描：

```
~/.ai/skills/
```

发现：

> 哦，我现在多了一个 `financial-analysis` 技能。

于是以后遇到：

> 「帮我分析这家公司财报。」

AI 就可以加载：

```
financial-analysis/SKILL.md
```

按照里面的 SOP 工作。

所以这里的“安装”，很多情况下其实更接近：

> **复制文件 + 注册技能**

而不是传统的软件安装。

---

## 为什么不用直接把 Markdown 复制给 AI？

当然可以。

假设 Skill 只有 100 行 Markdown，你完全可以每次复制：

```
请按照下面规则……
……
……
```

问题是：

**每次都复制很麻烦。**

于是 Skill 系统就相当于给 Prompt 做了一个：

> 「保存 + 命名 + 自动调用」

例如：

```
普通 Prompt
↓
每次复制粘贴

Skill
↓
保存成文件
↓
工具识别
↓
需要时自动加载
```

所以你可以把 Skill 理解成：

\[ \text{Skill} = \text{Prompt / Instructions} + \text{Workflow} + \text{Knowledge} + \text{Tools} + \text{Resources} \]

简单 Skill 可能只有：

\[ \text{Skill} \approx \text{SKILL.md} \]

复杂 Skill 则可能是：

\[ \text{Skill} = \text{SKILL.md} + \text{Scripts} + \text{Templates} + \text{References} + \text{Assets} \]

---

## 一个你很熟悉的例子

比如你想做一个：

**「吴恩达 AI 课程学习 Skill」**

最简单版本：

```
ai-course-learning/
└── SKILL.md
```

里面规定：

```
用户提供英文课程内容后：

1. 总结 AI 知识
2. 找出重要英文词汇
3. 找出高频表达
4. 使用费曼法解释
5. 生成 Obsidian 笔记
6. 最后给复习问题
```

这时候确实基本就是一个**高级 Prompt**。

但以后你把它升级：

```
ai-course-learning/
├── SKILL.md
├── templates/
│   └── obsidian-template.md
├── references/
│   └── vocabulary-level.md
└── scripts/
    └── subtitle_parser.py
```

它就不再只是 Prompt。

甚至可以：

```
视频
↓
脚本提取字幕
↓
Skill分析课程
↓
提取英语表达
↓
按照模板生成Obsidian笔记
```

这已经开始像一个**小型 AI 应用**了。

---

所以你可以记住这个关系：

```
Prompt
│
│  标准化
▼
Workflow / SOP
│
│  保存为文件
▼
SKILL.md
│
│  加入脚本、资料、模板
▼
Skill 文件夹
│
│  放进 AI 能识别的位置
▼
“安装 Skill”
```

**Markdown 不是 Skill 本身，只是描述 Skill 最常见的载体。**

而 GitHub 上之所以是文件形式，是因为要让它做到**可保存、可版本控制、可分享、可安装、可自动发现，而且还可以携带脚本和资料**。

你之前觉得 **Skill 和提示词本质很像**，这个直觉其实没错。更精确一点：**Prompt 是 Skill 最核心的原材料之一；Skill 则是把 Prompt 工程化、标准化、可复用化之后的东西。**
 
