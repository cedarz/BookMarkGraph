# 贡献指南

## 开发环境设置

1. 克隆仓库
```bash
git clone <repository-url>
cd listitems
```

2. 安装Chrome/Edge浏览器

3. 加载插件
   - 打开浏览器扩展程序管理页面
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

## 开发流程

1. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

2. 进行开发并测试

3. 提交更改
```bash
git add .
git commit -m "描述你的更改"
```

4. 推送到远程仓库
```bash
git push origin feature/your-feature-name
```

5. 创建Pull Request

## 代码规范

- 使用有意义的变量和函数名
- 添加适当的注释
- 遵循现有的代码风格
- 测试新功能

## 测试

- 使用`test.html`进行基础功能测试
- 使用`debug-test.html`进行详细调试
- 使用插件内置的调试功能

## 问题报告

如果发现问题，请提供：
- 浏览器版本
- 插件版本
- 错误信息
- 复现步骤
