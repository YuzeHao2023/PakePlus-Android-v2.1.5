# 安装包损坏
因为assembleRelease模式下的apk需要签名才可以使用。


# 签名
在本地生成签名文件：
```agsl
keytool -genkeypair -v \
-keystore release.keystore \
-keyalg RSA -keysize 2048 -validity 10000 \
-alias pakeplus_android
```
keytool是jdk自带的工具，路径在jdk/bin目录下。



# 或者使用assembleDebug
