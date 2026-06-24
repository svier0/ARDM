import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "ARDM",
		identifier: "ardm.electrobun.dev",
		version: "1.7.1.260624-alpha22",
	},
	build: {
		bun: {
			entrypoint: "src/bun/index.ts",
		},
		views: {
			mainview: {
				entrypoint: "src/mainview/index.ts",
			},
		},
		copy: {
			"src/mainview": "views/mainview",
		},
		win: {
			icon: "resources/icons/icon.ico",
		},
	},
	release: {
		baseUrl:
			"https://github.com/qishibo/AnotherRedisDesktopManager/releases/latest/download",
	},
} satisfies ElectrobunConfig;
