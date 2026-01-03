const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const ppconfig = require('./ppconfig.json')

function generateAdaptiveIcons(input, output) {
    const densities = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }

    // icon背景颜色,可设置为none透明
    const bgColor = '#FFFFFF'
    // 一般0.75, 前景最大占比（安全区）
    const foregroundScale = 0.68

    if (!fs.existsSync(output)) {
        fs.mkdirSync(output, { recursive: true })
    }

    for (const [folder, size] of Object.entries(densities)) {
        const dir = path.join(output, folder)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        const backgroundFile = path.join(dir, 'ic_launcher_background.png')
        const foregroundFile = path.join(dir, 'ic_launcher_foreground.png')

        // linux只能convert， 背景：纯色填充（全覆盖）
        execSync(
            `convert -size ${size}x${size} canvas:"${bgColor}" ${backgroundFile}`
        )

        // 前景大小 = 图标尺寸 × 0.75
        const fgSize = Math.round(size * foregroundScale)

        // 前景：缩放到安全区域，居中，四周自动留边
        execSync(
            `convert "${input}" -resize ${fgSize}x${fgSize} ` +
                `-gravity center -background none -extent ${size}x${size} ${foregroundFile}`
        )
    }

    // 生成 Adaptive Icon XML (放到 mipmap-anydpi-v26)
    const anydpiDir = path.join(output, 'mipmap-anydpi-v26')
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true })

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`

    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), xml, 'utf-8')

    console.log('✅ Adaptive Icons 已生成:', output)
}

const updateAppName = async (androidResDir, appName) => {
    // workerflow build apk name always is app-debug.apk
    try {
        const stringsPath = path.join(androidResDir, 'values', 'strings.xml')

        // Check if strings.xml exists
        const exists = await fs.pathExists(stringsPath)
        if (!exists) {
            console.log('⚠️ strings.xml not found, creating a new one')
            await fs.ensureDir(path.dirname(stringsPath))
            await fs.writeFile(
                stringsPath,
                `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>`
            )
            console.log(`✅ Created strings.xml with app_name: ${appName}`)
            return
        }

        // Read and update existing strings.xml
        let content = await fs.readFile(stringsPath, 'utf8')

        // Check if app_name already exists
        if (content.includes('<string name="app_name">')) {
            content = content.replace(
                /<string name="app_name">.*?<\/string>/,
                `<string name="app_name">${appName}</string>`
            )
        } else {
            // Add app_name if it doesn't exist
            content = content.replace(
                /<\/resources>/,
                `    <string name="app_name">${appName}</string>\n</resources>`
            )
        }

        await fs.writeFile(stringsPath, content)
        console.log(`✅ Updated app_name to: ${appName}`)
    } catch (error) {
        console.error('❌ Error updating app name:', error)
    }
}

const updateSafeArea = async (androidResDir, safeArea) => {
    try {
        // Assuming MainActivity.kt is in the standard location
        const mainActivityPath = path.join(
            androidResDir.replace('res', ''),
            'java/com/app/pakeplus/MainActivity.kt'
        )

        // Check if file exists
        const exists = await fs.pathExists(mainActivityPath)
        if (!exists) {
            console.log(
                '⚠️ MainActivity.kt not found at expected location:',
                mainActivityPath
            )
            return
        }
        // Read and update the file
        let content = await fs.readFile(mainActivityPath, 'utf8')

        // update safeArea
        if (safeArea) {
            if (safeArea === 'all') {
                console.log('webview debug to all')
            } else if (safeArea === 'top') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, systemBar.top, 0, 0)`
                )
            } else if (safeArea === 'bottom') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, 0, 0, systemBar.bottom)`
                )
            } else if (safeArea === 'left') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(systemBar.left, 0, 0, 0)`
                )
            } else if (safeArea === 'right') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, 0, systemBar.right, 0)`
                )
            } else if (safeArea === 'horizontal') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(systemBar.left, 0, systemBar.right, 0)`
                )
            } else if (safeArea === 'vertical') {
                content = content.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, systemBar.top, 0, systemBar.bottom)`
                )
            }
        }
        await fs.writeFile(mainActivityPath, content)
        console.log(`✅ Updated safeArea to: ${safeArea}`)
    } catch (error) {
        console.error('❌ Error updating safeArea:', error)
    }
}

// update build yml
const updateBuildYml = async (tagName, releaseName, releaseBody) => {
    try {
        const buildYmlPath = path.join('.github', 'workflows', 'build.yml')
        const exists = await fs.pathExists(buildYmlPath)
        if (!exists) {
            console.log(
                '⚠️ build.yml not found at expected location:',
                buildYmlPath
            )
            return
        }

        // Read the file
        let content = await fs.readFile(buildYmlPath, 'utf8')

        // Replace all occurrences of PakePlus-v0.0.1
        const tagUpdate = content.replaceAll('PakePlus-v0.0.1', tagName)
        const releaseUpdate = tagUpdate.replaceAll(
            'PakePlus v0.0.1',
            releaseName
        )
        const bodyUpdate = releaseUpdate.replaceAll(
            'PakePlus ReleaseBody',
            releaseBody
        )

        // Write back only if changes were made
        if (bodyUpdate !== content) {
            await fs.writeFile(buildYmlPath, bodyUpdate)
            console.log(`✅ Updated build.yml with new app name: ${tagName}`)
        } else {
            console.log('ℹ️ No changes needed in build.yml')
        }
    } catch (error) {
        console.error('❌ Error updating build.yml:', error)
    }
}

// set github env
const setGithubEnv = (name, version, pubBody) => {
    console.log('setGithubEnv......')
    const envPath = process.env.GITHUB_ENV
    if (!envPath) {
        console.error('GITHUB_ENV is not defined')
        return
    }
    try {
        const entries = {
            NAME: name,
            VERSION: version,
            PUBBODY: pubBody,
        }
        for (const [key, value] of Object.entries(entries)) {
            if (value !== undefined) {
                fs.appendFileSync(envPath, `${key}=${value}\n`)
            }
        }
        console.log('✅ Environment variables written to GITHUB_ENV')
        // 查看env 变量
        console.log(fs.readFileSync(envPath, 'utf-8'))
    } catch (err) {
        console.error('❌ Failed to parse config or write to GITHUB_ENV:', err)
    }
    console.log('setGithubEnv success')
}

// update android applicationId
const updateAndroidId = async (id) => {
    const gradlePath = path.join(__dirname, '../app/build.gradle.kts')
    const exists = await fs.pathExists(gradlePath)
    if (!exists) {
        console.log('⚠️ build.gradle.kts not found, creating a new one')
        return
    }

    // Read and update the file
    let content = await fs.readFile(gradlePath, 'utf8')

    // Replace the applicationId
    const updatedContent = content.replace(
        /applicationId = ".*?"/,
        `applicationId = "${id}"`
    )

    // Write back only if changes were made
    if (updatedContent !== content) {
        await fs.writeFile(gradlePath, updatedContent)
        console.log(`✅ Updated applicationId to: ${id}`)
    } else {
        console.log('ℹ️ No changes needed in build.gradle.kts')
    }
}

// copy html to android res dir
const initWebEnv = async (isHtml, webUrl, debug, safeArea, userAgent) => {
    const assetsPath = path.join(__dirname, '../app/src/main/assets')
    const appJsonPath = path.join(assetsPath, 'app.json')
    // load app.json
    const appJson = fs.readFileSync(appJsonPath, 'utf8')
    // appJson object
    const appJsonObj = JSON.parse(appJson)
    // userAgent
    if (userAgent) {
        appJsonObj.userAgent = userAgent
    } else {
        appJsonObj.userAgent = ''
    }
    // set fullScreen
    if (safeArea === 'fullscreen') {
        appJsonObj.fullScreen = true
    } else {
        appJsonObj.fullScreen = false
    }
    // set html
    if (isHtml) {
        // update webUrl
        appJsonObj.webUrl = 'file:///android_asset/index.html'
    } else {
        appJsonObj.webUrl = webUrl
    }
    // is debug
    if (debug) {
        // update debug
        appJsonObj.debug = true
    } else {
        appJsonObj.debug = false
        const vConsolePath = path.join(assetsPath, 'vConsole.js')
        // delete vConsole.js
        fs.removeSync(vConsolePath)
        console.log(`📦 vConsole.js deleted from Android res dir`)
    }
    if (isHtml) {
        // scripts/www/*
        const htmlPath = path.join(__dirname, './www/*')
        // copy to app/src/main/assets
        execSync(`cp -r ${htmlPath} ${assetsPath}`)
        console.log(`📦 HTML copied to Android res dir: ${assetsPath}`)
    } else {
        // delete app/src/main/assets/index.html
        const indexHtmlPath = path.join(assetsPath, 'index.html')
        await fs.remove(indexHtmlPath)
        console.log(`📦 index.html deleted from Android assets`)
    }
    // update app.json
    await fs.writeFile(appJsonPath, JSON.stringify(appJsonObj, null, 2), 'utf8')
    console.log(`✅ app.json updated: ${appJsonPath}`)
}

// Main execution
const main = async () => {
    const { webview } = ppconfig.phone
    const {
        name,
        version,
        id,
        pubBody,
        input,
        output,
        copyTo,
        webUrl,
        showName,
        debug,
        safeArea,
        isHtml,
    } = ppconfig.android

    const outPath = path.resolve(output)
    generateAdaptiveIcons(input, outPath)

    const dest = path.resolve(copyTo)
    await fs.copy(outPath, dest, { overwrite: true })
    console.log(`📦 Icons copied to Android res dir: ${dest}`)

    // Update app name if provided
    await updateAppName(dest, showName)

    // Update web URL if provided
    await updateSafeArea(dest, safeArea)

    // 删除根目录的res
    await fs.remove(outPath)

    // update android applicationId
    await updateAndroidId(id)

    // set github env
    setGithubEnv(name, version, pubBody)

    // copy html to android res dir
    const userAgent = webview.userAgent
    await initWebEnv(isHtml, webUrl, debug, safeArea, userAgent)

    // success
    console.log('✅ Worker Success')
}

// run
;(async () => {
    try {
        console.log('🚀 worker start')
        await main()
        console.log('🚀 worker end')
    } catch (error) {
        console.error('❌ Worker Error:', error)
    }
})()
