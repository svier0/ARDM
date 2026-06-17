import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "ARDM",
		identifier: "ardm.electrobun.dev",
		version: "1.7.1.1",
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
	},
	release: {
		baseUrl:
			"https://github.com/qishibo/AnotherRedisDesktopManager/releases/latest/download",
	},
} satisfies ElectrobunConfig;
