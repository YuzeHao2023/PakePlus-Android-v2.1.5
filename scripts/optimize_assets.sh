#!/bin/bash

# 资源优化脚本
echo "开始优化资源文件..."

# 进入assets目录
cd app/src/main/assets

# 压缩JavaScript文件（如果存在压缩工具）
if command -v uglifyjs &> /dev/null; then
    echo "压缩JavaScript文件..."
    uglifyjs main.js -o main.min.js -c -m
    uglifyjs custom.js -o custom.min.js -c -m
    mv main.min.js main.js
    mv custom.min.js custom.js
fi

# 压缩CSS文件（如果存在压缩工具）
if command -v cleancss &> /dev/null; then
    echo "压缩CSS文件..."
    cleancss -o styles.min.css styles.css
    mv styles.min.css styles.css
fi

# 压缩HTML文件（移除注释和多余空白）
echo "优化HTML文件..."
sed -i '' 's/<!--.*-->//g' index.html
sed -i '' 's/[[:space:]]\+/ /g' index.html
sed -i '' 's/>[[:space:]]*</></g' index.html

echo "资源优化完成！"
