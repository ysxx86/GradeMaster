// 全局变量
let currentGradeData = null;
let selectedGrade = 1; // 默认选择一年级

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面导航
    initNavigation();
    
    // 设置当前时间
    updateStatusBarTime();
    setInterval(updateStatusBarTime, 60000); // 每分钟更新一次
});

// 初始化导航
function initNavigation() {
    const tabItems = document.querySelectorAll('.tab-item');
    
    tabItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            
            // 更新导航栏选中状态
            tabItems.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            
            // 加载对应页面
            loadPage(page);
        });
    });
}

// 加载页面
function loadPage(page) {
    const iframe = document.getElementById('current-page');
    iframe.src = `pages/${page}.html`;
    
    // 页面加载完成后设置事件监听
    iframe.onload = function() {
        // 根据页面设置对应的监听器
        switch(page) {
            case 'upload':
                setupUploadPageListeners();
                break;
            case 'analysis':
                setupAnalysisPageListeners();
                break;
        }
    };
}

// 更新状态栏时间
function updateStatusBarTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    
    // 格式化时间
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    const timeString = `${hours}:${minutes}`;
    
    // 更新状态栏时间
    const timeElement = document.querySelector('.time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// 设置上传页面事件监听
function setupUploadPageListeners() {
    const iframe = document.getElementById('current-page');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    const fileUploadArea = iframeDoc.querySelector('.file-upload-area');
    const fileInput = iframeDoc.querySelector('#upload-file');
    
    if (fileUploadArea && fileInput) {
        fileUploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(e) {
            handleFileUpload(e, iframeDoc);
        });
    }
}

// 设置分析页面事件监听
function setupAnalysisPageListeners() {
    const iframe = document.getElementById('current-page');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    const gradeSelect = iframeDoc.querySelector('#grade-select');
    
    if (gradeSelect) {
        // 设置年级选择监听
        gradeSelect.addEventListener('change', function() {
            selectedGrade = parseInt(this.value);
            if (currentGradeData) {
                displayAnalysisResults(currentGradeData, iframeDoc);
            }
        });
    }
    
    // 如果有数据，显示分析结果
    if (currentGradeData) {
        displayAnalysisResults(currentGradeData, iframeDoc);
    } else {
        showNoDataMessage(iframeDoc);
    }
}

// 处理文件上传
function handleFileUpload(event, doc) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // 显示加载动画
        const loader = doc.querySelector('.loader');
        const uploadText = doc.querySelector('.file-upload-text');
        const alertElement = doc.querySelector('.alert');
        
        if (loader) loader.style.display = 'block';
        if (uploadText) uploadText.textContent = '正在处理文件...';
        if (alertElement) alertElement.style.display = 'none';
        
        // 处理Excel文件
        readExcelFile(file, doc);
    } else {
        // 显示错误消息
        showAlert(doc, 'error', '文件格式不支持', '请上传Excel文件（.xlsx或.xls格式）');
    }
}

// 读取Excel文件
function readExcelFile(file, doc) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        processExcelData(data, doc);
    };
    
    reader.onerror = function() {
        showAlert(doc, 'error', '文件读取失败', '请检查文件是否损坏或重新上传');
        resetUploadUI(doc);
    };
    
    reader.readAsArrayBuffer(file);
}

// 处理Excel数据
function processExcelData(data, doc) {
    try {
        // 使用SheetJS库处理Excel数据
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            throw new Error('Excel文件中没有数据');
        }
        
        // 处理并分析成绩数据
        processGradeData(jsonData, doc);
    } catch (error) {
        console.error("Excel处理错误:", error);
        showAlert(doc, 'error', 'Excel处理错误', error.message || '无法解析Excel文件');
        resetUploadUI(doc);
    }
}

// 处理成绩数据
function processGradeData(data, doc) {
    try {
        // 寻找成绩列
        let scoreKey = findScoreColumn(data);
        
        if (!scoreKey) {
            throw new Error('无法找到成绩列');
        }
        
        // 构建分析数据
        currentGradeData = data.map(item => {
            return {
                name: item['姓名'] || item['学生姓名'] || '未知',
                score: parseFloat(item[scoreKey]) || 0
            };
        }).filter(item => !isNaN(item.score));
        
        // 显示成功消息
        showAlert(doc, 'success', '文件上传成功', `成功解析 ${currentGradeData.length} 条成绩数据`);
        
        // 自动跳转到分析页面
        setTimeout(() => {
            const tabItems = document.querySelectorAll('.tab-item');
            tabItems.forEach(tab => {
                if (tab.getAttribute('data-page') === 'analysis') {
                    tab.click();
                }
            });
        }, 1500);
    } catch (error) {
        console.error("成绩处理错误:", error);
        showAlert(doc, 'error', '成绩处理错误', error.message || '无法处理成绩数据');
    } finally {
        resetUploadUI(doc);
    }
}

// 寻找成绩列
function findScoreColumn(data) {
    if (data.length === 0) return null;
    
    const firstRow = data[0];
    const possibleNames = ['成绩', '分数', '总分', 'score', 'grade'];
    
    // 查找匹配的列名
    for (const name of possibleNames) {
        for (const key in firstRow) {
            if (key.toLowerCase().includes(name.toLowerCase())) {
                return key;
            }
        }
    }
    
    // 如果没有找到匹配的列名，使用第一个数字列
    for (const key in firstRow) {
        if (typeof firstRow[key] === 'number') {
            return key;
        }
    }
    
    return null;
}

// 显示分析结果
function displayAnalysisResults(data, doc) {
    if (!data || data.length === 0) {
        showNoDataMessage(doc);
        return;
    }
    
    // 获取成绩统计信息
    const stats = calculateStats(data);
    
    // 更新统计卡片
    updateStatCard(doc, 'total-students', stats.totalStudents, '总人数', 'average');
    updateStatCard(doc, 'average-score', stats.averageScore.toFixed(2), '平均分', getAverageScoreClass(stats.averageScore));
    updateStatCard(doc, 'excellent-count', stats.excellentCount, '优秀人数', 'excellent');
    updateStatCard(doc, 'pass-rate', (stats.passRate * 100).toFixed(2) + '%', '及格率', getPassRateClass(stats.passRate));
    updateStatCard(doc, 'excellent-rate', (stats.excellentRate * 100).toFixed(2) + '%', '优秀率', getExcellentRateClass(stats.excellentRate));
    updateStatCard(doc, 'fail-count', stats.distribution[0].count, '不及格人数', stats.distribution[0].count > 0 ? 'warning' : 'good');
    
    // 添加分数分布比例指示器
    addScoreIndicator(doc, stats);
    
    // 添加分数段图例
    addScoreLegend(doc);
    
    // 更新分数段分布图
    updateDistributionChart(doc, stats.distribution);
}

// 根据平均分确定样式类
function getAverageScoreClass(averageScore) {
    if (averageScore >= 90) return 'excellent';
    if (averageScore >= 80) return 'good';
    if (averageScore >= 60) return 'average';
    return 'warning';
}

// 根据及格率确定样式类
function getPassRateClass(passRate) {
    if (passRate >= 0.95) return 'excellent';
    if (passRate >= 0.85) return 'good';
    if (passRate >= 0.60) return 'average';
    return 'warning';
}

// 根据优秀率确定样式类
function getExcellentRateClass(excellentRate) {
    if (excellentRate >= 0.40) return 'excellent';
    if (excellentRate >= 0.30) return 'good';
    if (excellentRate >= 0.20) return 'average';
    return 'warning';
}

// 添加分数比例指示器
function addScoreIndicator(doc, stats) {
    const distributionSection = doc.querySelector('.distribution-section');
    if (!distributionSection) return;
    
    // 检查是否已存在指示器，如果存在则移除
    const existingIndicator = doc.querySelector('.score-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // 创建分数比例指示器
    const indicator = document.createElement('div');
    indicator.className = 'score-indicator';
    
    // 计算总学生数
    const totalStudents = stats.totalStudents;
    
    // 为每个分数段创建指示器段
    stats.distribution.forEach((item, index) => {
        const segment = document.createElement('div');
        segment.className = 'score-indicator-segment';
        
        // 设置宽度为该分数段学生比例
        const width = (item.count / totalStudents) * 100;
        segment.style.width = width + '%';
        
        // 根据分数段设置颜色类
        switch(index) {
            case 0: segment.classList.add('fail'); break;      // 0-59
            case 1: segment.classList.add('pass'); break;      // 60-69
            case 2: segment.classList.add('good'); break;      // 70-79
            case 3: segment.classList.add('very-good'); break; // 80-89
            case 4: segment.classList.add('excellent'); break; // 90-100
        }
        
        indicator.appendChild(segment);
    });
    
    // 将指示器插入到分布标题后面
    const chartTitle = distributionSection.querySelector('.text-lg');
    if (chartTitle) {
        chartTitle.insertAdjacentElement('afterend', indicator);
    } else {
        distributionSection.prepend(indicator);
    }
}

// 添加分数段图例
function addScoreLegend(doc) {
    const distributionSection = doc.querySelector('.distribution-section');
    if (!distributionSection) return;
    
    // 检查是否已存在图例，如果存在则移除
    const existingLegend = doc.querySelector('.score-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    // 创建图例容器
    const legend = document.createElement('div');
    legend.className = 'score-legend';
    
    // 分数段描述
    const scoreRanges = [
        { class: 'fail', label: '不及格 (0-59)' },
        { class: 'pass', label: '及格 (60-69)' },
        { class: 'good', label: '中等 (70-79)' },
        { class: 'very-good', label: '良好 (80-89)' },
        { class: 'excellent', label: '优秀 (90-100)' }
    ];
    
    // 为每个分数段创建图例项
    scoreRanges.forEach(range => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('span');
        colorBox.className = `legend-color ${range.class}`;
        
        const label = document.createElement('span');
        label.textContent = range.label;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legend.appendChild(item);
    });
    
    // 将图例插入到分数指示器后面
    const indicator = doc.querySelector('.score-indicator');
    if (indicator) {
        indicator.insertAdjacentElement('afterend', legend);
    } else {
        const chartTitle = distributionSection.querySelector('.text-lg');
        if (chartTitle) {
            chartTitle.insertAdjacentElement('afterend', legend);
        } else {
            distributionSection.prepend(legend);
        }
    }
}

// 更新统计卡片
function updateStatCard(doc, id, value, label, cardClass) {
    const cardElement = doc.getElementById(id);
    if (cardElement) {
        const valueElement = cardElement.querySelector('.stat-value');
        const labelElement = cardElement.querySelector('.stat-label');
        
        if (valueElement) valueElement.textContent = value;
        if (labelElement) labelElement.textContent = label;
        
        // 设置卡片样式类
        if (cardClass) {
            cardElement.className = 'stat-card';
            cardElement.classList.add(cardClass);
        }
    }
}

// 更新分布图
function updateDistributionChart(doc, distribution) {
    const chartContainer = doc.querySelector('.bar-container');
    if (!chartContainer) return;
    
    // 清空旧内容
    chartContainer.innerHTML = '';
    
    // 找出最大计数以确定百分比高度
    const maxCount = Math.max(...distribution.map(item => item.count));
    const maxHeight = 200; // 最大高度（像素）
    
    // 为每个分数段创建柱状图
    distribution.forEach((item, index) => {
        const height = item.count > 0 ? Math.max((item.count / maxCount) * maxHeight, 20) : 0;
        
        const barGroup = document.createElement('div');
        barGroup.className = 'bar-group';
        
        const bar = document.createElement('div');
        bar.className = 'bar';
        
        // 根据分数段设置颜色类
        switch(index) {
            case 0: bar.classList.add('fail'); break;      // 0-59
            case 1: bar.classList.add('pass'); break;      // 60-69
            case 2: bar.classList.add('good'); break;      // 70-79
            case 3: bar.classList.add('very-good'); break; // 80-89
            case 4: bar.classList.add('excellent'); break; // 90-100
        }
        
        bar.style.height = `${height}px`;
        bar.setAttribute('data-count', item.count);
        
        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.textContent = item.range;
        
        barGroup.appendChild(bar);
        barGroup.appendChild(barLabel);
        chartContainer.appendChild(barGroup);
    });
}

// 计算成绩统计信息
function calculateStats(data) {
    // 确定优秀分数线
    let excellentThreshold;
    let gradeName = '';
    switch(selectedGrade) {
        case 1:
            gradeName = '一';
            excellentThreshold = 90;
            break;
        case 2:
            gradeName = '二';
            excellentThreshold = 90;
            break;
        case 3:
            gradeName = '三';
            excellentThreshold = 85;
            break;
        case 4:
            gradeName = '四';
            excellentThreshold = 85;
            break;
        case 5:
            gradeName = '五';
            excellentThreshold = 80;
            break;
        case 6:
            gradeName = '六';
            excellentThreshold = 80;
            break;
    }
    
    // 计算总分和平均分
    const totalScore = data.reduce((sum, item) => sum + item.score, 0);
    const averageScore = totalScore / data.length;
    
    // 计算及格和优秀人数
    const passCount = data.filter(item => item.score >= 60).length;
    const excellentCount = data.filter(item => item.score >= excellentThreshold).length;
    
    // 计算及格率和优秀率
    const passRate = passCount / data.length;
    const excellentRate = excellentCount / data.length;
    
    // 计算分数段分布
    const distribution = [
        { range: '0-59', count: data.filter(item => item.score < 60).length },
        { range: '60-69', count: data.filter(item => item.score >= 60 && item.score < 70).length },
        { range: '70-79', count: data.filter(item => item.score >= 70 && item.score < 80).length },
        { range: '80-89', count: data.filter(item => item.score >= 80 && item.score < 90).length },
        { range: '90-100', count: data.filter(item => item.score >= 90 && item.score <= 100).length }
    ];
    
    return {
        totalStudents: data.length,
        averageScore,
        excellentCount,
        passRate,
        excellentRate,
        distribution
    };
}

// 显示无数据消息
function showNoDataMessage(doc) {
    const analysisContent = doc.querySelector('.analysis-content');
    if (analysisContent) {
        analysisContent.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-circle alert-icon"></i>
                <div>
                    <p>暂无成绩数据可分析</p>
                    <p>请先在上传页面导入Excel成绩文件</p>
                </div>
            </div>
            <button class="ios-button" id="goto-upload">前往上传页面</button>
        `;
        
        // 添加跳转按钮监听
        const gotoUploadBtn = doc.getElementById('goto-upload');
        if (gotoUploadBtn) {
            gotoUploadBtn.addEventListener('click', function() {
                const tabItems = document.querySelectorAll('.tab-item');
                tabItems.forEach(tab => {
                    if (tab.getAttribute('data-page') === 'upload') {
                        tab.click();
                    }
                });
            });
        }
    }
}

// 显示警告提示
function showAlert(doc, type, title, message) {
    const alertElement = doc.querySelector('.alert');
    if (alertElement) {
        // 设置提示类型
        alertElement.className = `alert alert-${type}`;
        
        // 设置图标
        const iconElement = alertElement.querySelector('.alert-icon');
        if (iconElement) {
            iconElement.className = 'fas alert-icon';
            
            switch(type) {
                case 'warning':
                    iconElement.classList.add('fa-exclamation-circle');
                    break;
                case 'success':
                    iconElement.classList.add('fa-check-circle');
                    break;
                case 'error':
                    iconElement.classList.add('fa-times-circle');
                    break;
            }
        }
        
        // 设置文本内容
        const titleElement = alertElement.querySelector('.alert-title');
        const messageElement = alertElement.querySelector('.alert-message');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        
        // 显示提示
        alertElement.style.display = 'flex';
    }
}

// 重置上传UI
function resetUploadUI(doc) {
    const loader = doc.querySelector('.loader');
    const uploadText = doc.querySelector('.file-upload-text');
    const fileInput = doc.querySelector('#upload-file');
    
    if (loader) loader.style.display = 'none';
    if (uploadText) uploadText.textContent = '点击或拖拽上传成绩表';
    if (fileInput) fileInput.value = '';
}

// 导出成绩分析报告为PDF
function exportGradeReport() {
    if (!currentGradeData || currentGradeData.length === 0) {
        alert('暂无成绩数据，请先上传成绩表！');
        return;
    }
    
    // 获取iframe文档对象
    const iframe = document.getElementById('current-page');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // 创建报告容器
    const reportContainer = document.createElement('div');
    reportContainer.className = 'report-container';
    reportContainer.style.cssText = 'width: 210mm; padding: 20mm; font-family: Arial, sans-serif; color: #000;';
    
    // 获取当前年级和相应的优秀标准
    let excellentThreshold;
    let gradeName = '';
    switch(selectedGrade) {
        case 1:
            gradeName = '一';
            excellentThreshold = 90;
            break;
        case 2:
            gradeName = '二';
            excellentThreshold = 90;
            break;
        case 3:
            gradeName = '三';
            excellentThreshold = 85;
            break;
        case 4:
            gradeName = '四';
            excellentThreshold = 85;
            break;
        case 5:
            gradeName = '五';
            excellentThreshold = 80;
            break;
        case 6:
            gradeName = '六';
            excellentThreshold = 80;
            break;
    }
    
    // 计算统计数据
    const stats = calculateStats(currentGradeData);
    
    // 创建报告内容
    const reportHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 24px; margin-bottom: 10px;">成绩分析报告</h1>
            <p style="font-size: 14px; color: #666;">${new Date().toLocaleDateString()} 生成</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                基本信息
            </h2>
            <p style="margin-bottom: 5px;"><strong>年级：</strong>${gradeName}年级</p>
            <p style="margin-bottom: 5px;"><strong>优秀标准：</strong>≥ ${excellentThreshold}分</p>
            <p style="margin-bottom: 5px;"><strong>总人数：</strong>${stats.totalStudents}人</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                成绩统计
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">平均分</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">及格人数</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">优秀人数</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">及格率</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">优秀率</th>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${stats.averageScore.toFixed(2)}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${stats.totalStudents - stats.distribution[0].count}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${stats.excellentCount}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${(stats.passRate * 100).toFixed(2)}%</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${(stats.excellentRate * 100).toFixed(2)}%</td>
                </tr>
            </table>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                分数段分布
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">分数段</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">人数</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">百分比</th>
                </tr>
                ${stats.distribution.map(item => `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.range}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${item.count}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${(item.count / stats.totalStudents * 100).toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </table>
        </div>
        
        <div style="font-size: 12px; color: #666; margin-top: 30px; text-align: center;">
            <p>此报告由成绩大师自动生成</p>
        </div>
    `;
    
    reportContainer.innerHTML = reportHTML;
    
    // 生成报告文件名
    const fileName = `成绩分析报告_${gradeName}年级_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    
    // 配置html2pdf选项
    const options = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // 显示正在生成报告的提示
    alert('正在生成PDF报告，请稍候...');
    
    // 生成PDF
    html2pdf().set(options).from(reportContainer).save().then(() => {
        console.log('成绩报告生成成功！');
    }).catch(error => {
        console.error('生成报告出错:', error);
        alert('生成报告时出错，请重试！');
    });
}
