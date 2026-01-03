#!/bin/bash

ICON=./pakeplus.png
DEST=./app/src/main/res

# ---- 1. 清理旧资源 ----
echo "🗑️ 清理旧图标..."
rm -rf $DEST/mipmap-*/ic_launcher*.png
rm -rf $DEST/drawable*/ic_launcher_*.png
rm -f $DEST/mipmap-anydpi-v26/ic_launcher*.xml

# ---- 2. 生成传统图标 ----
folders=("mipmap-mdpi" "mipmap-hdpi" "mipmap-xhdpi" "mipmap-xxhdpi" "mipmap-xxxhdpi")
sizes=(48 72 96 144 192)

echo "🔄 生成传统图标..."
for i in "${!folders[@]}"; do
  folder=${folders[$i]}
  size=${sizes[$i]}
  mkdir -p "$DEST/$folder"
  magick "$ICON" -resize ${size}x${size} "$DEST/$folder/ic_launcher.png"
  magick "$ICON" -resize ${size}x${size} \
    -gravity center -background transparent \
    -extent ${size}x${size} \
    -fill none -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \
    -alpha on "$DEST/$folder/ic_launcher_round.png"
done

# ---- 3. 生成自适应图标 ----
echo "🎨 生成自适应图标..."
mkdir -p "$DEST/drawable-anydpi-v26"

# 前景层（核心内容）
magick "$ICON" -resize 108x108 -gravity center -background transparent \
  -extent 108x108 "$DEST/drawable-anydpi-v26/ic_launcher_foreground.png"

# 背景层（纯色）
magick -size 108x108 xc:"#4285F4" \
  "$DEST/drawable-anydpi-v26/ic_launcher_background.png"

# XML定义
mkdir -p "$DEST/mipmap-anydpi-v26"
cat > "$DEST/mipmap-anydpi-v26/ic_launcher.xml" <<EOF
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
EOF

cat > "$DEST/mipmap-anydpi-v26/ic_launcher_round.xml" <<EOF
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
EOF

echo "✅ 图标生成完成！请执行："
echo "1. Build > Clean Project"
echo "2. 卸载手机上旧版APP"
echo "3. 重新运行项目"