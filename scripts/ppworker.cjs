const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')
const ppconfig = require('./ppconfig.json')

// icon size
const DENSITIES = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
}

// generate adaptive icons
const generateAdaptiveIcons = async (input, outputDir) => {
    for (const [dpi, size] of Object.entries(DENSITIES)) {
        const mipmapDir = path.join(outputDir, `mipmap-${dpi}`)
        await fs.ensureDir(mipmapDir)
        const foregroundPath = path.join(
            mipmapDir,
            'ic_launcher_foreground.webp'
        )
        const backgroundPath = path.join(
            mipmapDir,
            'ic_launcher_background.webp'
        )
        const legacyPath = path.join(mipmapDir, 'ic_launcher.webp')
        const legacyRoundPath = path.join(mipmapDir, 'ic_launcher_round.webp')

        // 创建圆形遮罩
        const roundedMask = Buffer.from(
            `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${
                size / 2
            }" fill="white"/></svg>`
        )

        // 生成普通图标
        const img = sharp(input).resize(size, size)
        await img.webp().toFile(foregroundPath)
        await img.webp().toFile(legacyPath)

        // 生成圆形图标
        const roundedImg = img.composite([
            {
                input: roundedMask,
                blend: 'dest-in',
            },
        ])
        await roundedImg.webp().toFile(legacyRoundPath)

        // 生成背景
        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: '#FFFFFF',
            },
        })
            .webp()
            .toFile(backgroundPath)
    }

    // Generate XML
    const xmlPath = path.join(outputDir, 'mipmap-anydpi-v26')
    await fs.ensureDir(xmlPath)
    await fs.writeFile(
        path.join(xmlPath, 'ic_launcher.xml'),
        `
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
  `.trim()
    )

    await fs.writeFile(
        path.join(xmlPath, 'ic_launcher_round.xml'),
        `
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
  `.trim()
    )

    console.log('✅ Adaptive icons generated in WebP format.')
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

const updateWebEnv = async (androidResDir, webUrl, debug, webview) => {
    try {
        const { userAgent } = webview

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

        // Replace the web URL in the loadUrl call
        let updatedContent = content.replace(
            /webView\.loadUrl\(".*?"\)/,
            `webView.loadUrl("${webUrl}")`
        )
        // if debug is true, add debug mode
        console.log('webview debug to:', debug)
        if (debug) {
            updatedContent = updatedContent.replace(
                'private var debug = false',
                'private var debug = true'
            )
        }

        // update webview userAgent
        if (userAgent) {
            updatedContent = updatedContent.replace(
                '// webView.settings.userAgentString = ""',
                `webView.settings.userAgentString = "${userAgent}"`
            )
        }

        await fs.writeFile(mainActivityPath, updatedContent)
        console.log(`✅ Updated web URL to: ${webUrl}`)
    } catch (error) {
        console.error('❌ Error updating web URL:', error)
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
    } = ppconfig.android

    const outPath = path.resolve(output)
    await generateAdaptiveIcons(input, outPath)

    const dest = path.resolve(copyTo)
    await fs.copy(outPath, dest, { overwrite: true })
    console.log(`📦 Icons copied to Android res dir: ${dest}`)

    // Update app name if provided
    await updateAppName(dest, showName)

    // Update web URL if provided
    await updateWebEnv(dest, webUrl, debug, webview)

    // 删除根目录的res
    await fs.remove(outPath)

    // update android applicationId
    await updateAndroidId(id)

    // set github env
    setGithubEnv(name, version, pubBody)

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
