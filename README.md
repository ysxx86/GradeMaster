# 成绩大师 (GradeMaster)
直达：https://ysxx86.github.io/GradeMaster/
一个基于HTML+JS+CSS开发的中文网页成绩分析应用，采用iOS风格设计。

## 功能特点

- 上传Excel成绩表格进行自动分析
- 根据不同年级（一至六年级）设置不同的优秀标准
- 展示总分、平均分、优秀人数、及格率、优秀率等关键数据
- 分析各个分数段人数分布
- 现代化iOS风格界面设计
- 响应式界面，适配桌面和移动设备

## 优秀标准设置

- 一、二年级：90-100分为优秀
- 三、四年级：85-100分为优秀
- 五、六年级：80-100分为优秀

## 使用说明

1. 打开首页，了解应用功能
2. 进入"上传"页面，上传Excel格式成绩表
3. 上传成功后自动进入"分析"页面
4. 在分析页面选择对应年级，查看详细成绩统计和分布数据

## 技术实现

- 前端框架：原生HTML5 + CSS3 + JavaScript
- UI组件：Tailwind CSS + Font Awesome
- Excel处理：SheetJS库
- 页面导航：iframe实现无刷新切换

## 文件结构

- `index.html` - 主页面框架
- `css/styles.css` - 全局样式表
- `js/app.js` - 应用逻辑
- `pages/` - 各功能页面
  - `home.html` - 首页
  - `upload.html` - 成绩上传页
  - `analysis.html` - 成绩分析页
  - `settings.html` - 设置页面
