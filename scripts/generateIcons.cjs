const sharp = require('sharp')
const fs = require('fs-extra')
const path = require('path')
const { program } = require('commander')

const DENSITIES = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192,
}

program
    .requiredOption('-i, --input <file>', 'Path to source PNG')
    .option('-o, --output <dir>', 'Output directory', 'res')
    .option('--rounded', 'Apply circular mask to icons')
    .option('--copy-to <androidResDir>', 'Copy icons to Android res directory')
    .option('--app-name <name>', 'Set the app name in strings.xml')
    .option('--web-url <url>', 'Set the web URL in MainActivity.kt')

program.parse(process.argv)
const options = program.opts()

async function generateAdaptiveIcons(input, outputDir) {
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

async function updateAppName(androidResDir, appName) {
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

async function updateWebUrl(androidResDir, webUrl) {
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

        // Replace the web URL in the loadUrl call
        const updatedContent = content.replace(
            /webView\.loadUrl\(".*?"\)/,
            `webView.loadUrl("${webUrl}")`
        )

        await fs.writeFile(mainActivityPath, updatedContent)
        console.log(`✅ Updated web URL to: ${webUrl}`)
    } catch (error) {
        console.error('❌ Error updating web URL:', error)
    }
}

// Main execution
;(async () => {
    const { input, output, copyTo, appName, webUrl } = options
    const outPath = path.resolve(output)
    await generateAdaptiveIcons(input, outPath)

    if (copyTo) {
        const dest = path.resolve(copyTo)
        await fs.copy(outPath, dest, { overwrite: true })
        console.log(`📦 Icons copied to Android res dir: ${dest}`)

        // Update app name if provided
        if (appName) {
            await updateAppName(dest, appName)
        }

        // Update web URL if provided
        if (webUrl) {
            await updateWebUrl(dest, webUrl)
        }

        // 删除根目录的res
        await fs.remove(outPath)
    } else {
        if (appName) {
            console.log('⚠️ --app-name requires --copy-to to be specified')
        }
        if (webUrl) {
            console.log('⚠️ --web-url requires --copy-to to be specified')
        }
    }
})()
