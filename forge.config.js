module.exports = {
    "packagerConfig": {
        "name": "飞将象棋",
        "icon": "./assets/img/ICON.ico",
        "extraResource":  [
            './assets/engine',
            './assets/img/ICON.png'
        ],
    },
    "makers": [
        {
            "name": "@electron-forge/maker-squirrel",
            "config": {
                "name": "electorn_chinese_chess"
            }
        },
        {
            "name": "@electron-forge/maker-zip",
            // "platforms": [
            //     "darwin"
            // ]
        },
        {
            "name": "@electron-forge/maker-deb",
            "config": {}
        },
        {
            "name": "@electron-forge/maker-rpm",
            "config": {}
        }
    ],
    "plugins": [
        [
            "@electron-forge/plugin-webpack",
            {
                "mainConfig": "./webpack.main.config.js",
                "renderer": {
                    "config": "./webpack.renderer.config.js",
                    "entryPoints": [
                        {
                            "html": "./src/renderer/index.html",
                            "js": "./src/renderer/index.ts",
                            "name": "main_window"
                        },
                        {
                            "html": "./src/renderer/about.html",
                            "js": "./src/renderer/about.ts",
                            "name": "about_window"
                        }
                    ]
                }
            }
        ]
    ]
}