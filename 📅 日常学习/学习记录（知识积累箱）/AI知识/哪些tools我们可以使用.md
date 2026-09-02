Tools 可以理解成：**给 Agent 接上的“手、眼睛、耳朵和各种专业设备”。**

LLM 本身主要负责：

> **理解 + 推理 + 决策 + 生成文字**

但 Tools 负责：

> **真正接触外部世界并执行动作。**

所以 Agent 的核心经常可以写成：

> **大脑 LLM + 工具 Tools + 工作流程**

常见 Tools 大致是这些：

|Tool 类型|相当于|能干什么|
|---|---|---|
|🌐 Web / Browser|眼睛|搜新闻、网页、财报、资料|
|🔎 Search|搜索员|Google/Bing/站内检索|
|📄 File Reader|阅读器|PDF、Word、Excel、Markdown|
|🧮 Python / Calculator|计算器|数据分析、统计、画图、金融计算|
|💻 Shell / Terminal|双手|运行程序、安装依赖、处理文件|
|👨‍💻 Code Tool|程序员|写代码、改代码、测试代码|
|🗄 Database|档案柜|SQL 查询、写入数据|
|🧠 Vector Search|智能图书管理员|RAG 检索知识库|
|📧 Email|邮件秘书|搜邮件、整理、草拟、发送|
|📅 Calendar|日程秘书|查日程、创建会议、提醒|
|📁 Cloud Storage|文件柜|Drive、Dropbox 等|
|🔗 API|万能接口|调天气、股票、支付、地图等服务|
|🖥 Computer Use|鼠标键盘|操作网页和软件界面|
|🤖 Automation|定时员工|每天/每周自动执行任务|
|📷 Vision|眼睛|看图片、截图、图表|
|🎨 Image Generation|设计师|生成或修改图片|
|🔔 Notification|通知员|条件满足时提醒你|

关键是：**不是 Tool 越多越厉害，而是要根据任务选择工具。**

---

### 例如一个“金融研究 Agent”

如果你说：

> “分析宁德时代最新一季度的投资价值。”

Agent 可以这样调用工具：

```
用户任务
↓
LLM 制定计划
↓
🌐 Web Search
找最新财报、公告、新闻
↓
📄 PDF Reader
读取财报
↓
🧮 Python
计算：
ROE
ROIC
毛利率
现金流
增长率
↓
🔎 Web
查竞争对手和行业数据
↓
🧠 RAG
查询你的金融知识库
↓
LLM
综合分析
↓
Reflection
检查逻辑漏洞
↓
📄 输出研究报告
```

注意这里：

> **LLM 决定干什么，Tool 负责真的去干。**

---

### 再比如学习 Agent

你上传一本《公司理财》。

Agent 可以：

```
📄 File Reader
读取教材
↓
🧠 RAG
检索对应章节
↓
LLM
给你解释
↓
🧮 Python
生成计算例题
↓
Memory
记录你不会什么
↓
Automation
两天后给你复习
```

于是它不再只是：

> “回答金融问题。”

而是在执行：

> **完整学习流程。**

---

### 再比如创业研究 Agent

你说：

> “帮我判断 AI 英语学习产品值不值得做。”

它可能：

```
🌐 搜索市场
↓
🌐 搜竞品
↓
📄 阅读竞品资料
↓
🧮 Python
测算：
用户数
价格
CAC
LTV
收入
利润
↓
LLM
分析商业模式
↓
Critic Agent
专门找失败原因
↓
生成创业分析
```

---

## API 为什么特别重要？

因为绝大多数 Agent Tool，本质上最终都可以理解成：

> **AI 调用了一个函数 / API。**

例如：

```
get_stock_price("AAPL")
```

返回：

```
最新股价数据
```

AI看到结果以后再决定：

> “我要继续查财报。”

然后调用：

```
get_financial_report("AAPL")
```

再获得结果。

所以 Agent 很核心的循环其实就是：

```
思考
↓
选择工具
↓
调用工具
↓
得到结果
↓
观察结果
↓
再次思考
↓
选择下一个工具
```

这就是你前面学的 **ReAct** 开始和 **Tools** 连接起来了。

---

## Tools 和 RAG 也要区分

RAG 严格来说，本身也可以作为一个 Tool。

例如 Agent 拥有：

```
Tools

├── Web Search
├── Calculator
├── Python
├── Email
├── Calendar
└── Search Knowledge Base
                  ↑
                 RAG
```

AI觉得：

> “这个问题应该查用户自己的资料。”

就调用：

> `search_knowledge_base()`

这就是 RAG Tool。

---

## 我们现在这个 ChatGPT 环境里，其实也已经有很多 Tool 能力

在合适的任务下，我可以帮你做的包括：搜索公开网页、查找和读取文件、分析数据与运行 Python、处理 GitHub、在已连接的情况下处理 Gmail/日历/联系人、创建定时或条件任务、生成和编辑图片等。

所以你现在和我聊天时，有些时候已经不是纯粹：

> **User → LLM → Answer**

而可能实际上是：

```
你
↓
GPT
↓
判断需要什么工具
↓
调用工具
↓
获取真实结果
↓
继续推理
↓
给你答案
```

这本身就已经是 Agent 思想的一部分。

---

真正理解 Tools 后，你可以记住一句：

> **没有 Tools 的 AI 是“军师”；有了 Tools 的 AI 才开始变成“执行者”。**

而一个比较完整的 Agent，往往就是：

> **Prompt 定任务 → Plan 制定计划 → ReAct 决定下一步 → Tools 执行动作 → RAG 查知识 → Reflection 检查结果 → Memory 保存经验。**

到这里，你前面问的这些模块其实已经基本连成一个完整系统了。