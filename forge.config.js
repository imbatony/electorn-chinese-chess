module.exports = {
    "packagerConfig": {
        "name": "乐乐象棋",
        "icon": "./assets/img/chess.ico",
        "extraResource":  [
            './assets/engine'
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
                        }
                    ]
                }
            }
        ]
    ]
}