/**
 * ARDM 便携包构建脚本
 *
 * 用法:
 *   bun run scripts/build-portable.ts
 *   bun run scripts/build-portable.ts --version "1.7.1.260621-alpha8"
 *
 * 流程:
 *   1. 清理 dist/、build/、artifacts/ 目录
 *   2. electrobun build --env=stable
 *   3. 复制构建产物到 dist/ 下
 *   4. 重命名 launcher.exe → ARDM.exe
 *   5. rcedit 嵌入图标
 *   6. 清理杂文件 (Info.plist 等)
 *   7. 验证文件结构
 *   8. 打包 7z
 *   9. 清理 build/ 和 artifacts/
 */

import { $ } from "bun";
import { existsSync, rmSync, mkdirSync, readdirSync, copyFileSync, renameSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const BUILD_DIR = join(ROOT, "build");
const DIST_DIR = join(ROOT, "dist");
const ARTIFACTS_DIR = join(ROOT, "artifacts");
const RESOURCES_DIR = join(ROOT, "resources");
const ICON_PATH = join(RESOURCES_DIR, "icons", "icon.ico");
const STABLE_DIR = join(BUILD_DIR, "stable-win-x64");

// ─── 版本号 ────────────────────────────────────────────────────────────────

async function generateVersion(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;

  // 读取构建计数器
  const counterPath = join(ROOT, "build-counter.json");
  let count = 1;
  let lastDate = "";

  if (existsSync(counterPath)) {
    try {
      const data = JSON.parse(await Bun.file(counterPath).text());
      lastDate = data.date || "";
      if (lastDate === `${now.getFullYear()}-${mm}-${dd}`) {
        count = (data.count || 0) + 1;
      }
    } catch {}
  }

  // 写回计数器
  await Bun.write(
    counterPath,
    JSON.stringify(
      { date: `${now.getFullYear()}-${mm}-${dd}`, count },
      null,
      2
    )
  );

  return `1.7.1.${dateStr}-alpha${count}`;
}

// ─── 辅助函数 ──────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[build-portable] ${msg}`);
}

function warn(msg: string) {
  console.warn(`[build-portable] ⚠️ ${msg}`);
}

function error(msg: string) {
  console.error(`[build-portable] ❌ ${msg}`);
}

async function run(cmd: string[], opts?: { cwd?: string; quiet?: boolean }) {
  if (!opts?.quiet) log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawnSync(cmd, {
    cwd: opts?.cwd || ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (proc.exitCode !== 0) {
    const stderr = new TextDecoder().decode(proc.stderr);
    throw new Error(`Command failed (exit ${proc.exitCode}): ${stderr}`);
  }
  return new TextDecoder().decode(proc.stdout).trim();
}

// ─── 主流程 ────────────────────────────────────────────────────────────────

async function main() {
  const versionArg = process.argv.find((a) => a.startsWith("--version="));
  const version = versionArg
    ? versionArg.split("=")[1]
    : await generateVersion();

  log(`开始构建便携包: ${version}`);

  // ── Step 1: 清理 dist/、build/、artifacts/ 目录 ─────────────────────────
  log("Step 1: 清理 dist/、build/、artifacts/ 目录");
  for (const dir of [DIST_DIR, BUILD_DIR, ARTIFACTS_DIR]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // ── Step 2: electrobun build ────────────────────────────────────────────
  log("Step 2: 执行 electrobun build --env=stable");
  await run(["bun", "x", "electrobun", "build", "--env=stable"]);

  // ── Step 3: 查找并解压构建产物 ───────────────────────────────────────────
  log("Step 3: 查找构建产物");

  if (!existsSync(STABLE_DIR)) {
    throw new Error(`构建产物目录不存在: ${STABLE_DIR}`);
  }

  // 找 .tar.zst 文件
  const files = readdirSync(STABLE_DIR);
  const zstFile = files.find((f) => f.endsWith(".tar.zst"));
  if (!zstFile) {
    throw new Error(`在 ${STABLE_DIR} 中未找到 *.tar.zst 文件`);
  }

  const zstPath = join(STABLE_DIR, zstFile);
  const destDirName = `ARDM-${version}-Win64`;
  const destPath = join(DIST_DIR, destDirName);

  log(`解压: ${zstFile} → ${destDirName}`);

  // 清理目标
  if (existsSync(destPath)) {
    rmSync(destPath, { recursive: true, force: true });
  }
  mkdirSync(destPath, { recursive: true });

  // 7z 解压 .tar.zst（直接解压 zst → 展开，或产生中间 .tar）
  await run(["7z", "x", zstPath, `-o${destPath}`, "-y"], { quiet: true });

  // 如果产生了中间 .tar 文件，再解一次
  const nestedTars = readdirSync(destPath).filter((f) => f.endsWith(".tar"));
  if (nestedTars.length > 0) {
    for (const tarFile of nestedTars) {
      const tarPath = join(destPath, tarFile);
      log(`  解压中间层: ${tarFile}`);
      await run(["7z", "x", tarPath, `-o${destPath}`, "-y"], { quiet: true });
      rmSync(tarPath, { force: true });
    }
  }

  // 检查解压后是否有多一层嵌套目录（electrobun 可能打包成嵌套结构）
  const entries = readdirSync(destPath);
  if (entries.length === 1 && existsSync(join(destPath, entries[0])) && statSync(join(destPath, entries[0])).isDirectory()) {
    const innerDir = join(destPath, entries[0]);
    log(`  展平嵌套目录: ${entries[0]}/`);
    // 将内层所有文件和目录移到外层（同一驱动器的 rename 是原子操作）
    const innerFiles = readdirSync(innerDir);
    for (const f of innerFiles) {
      const src = join(innerDir, f);
      const dst = join(destPath, f);
      if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
      renameSync(src, dst);
    }
    // 删除空的内层目录
    try { rmSync(innerDir, { recursive: true, force: true }); } catch {}
  }

  // ── Step 4: 重命名 launcher.exe → ARDM.exe ──────────────────────────────
  log("Step 4: 重命名 launcher.exe → ARDM.exe");
  const binDir = join(destPath, "bin");
  const launcherExe = join(binDir, "launcher.exe");
  const ardmExe = join(binDir, "ARDM.exe");

  if (existsSync(launcherExe)) {
    // renameSync 跨驱动器会失败，用 copy + delete
    copyFileSync(launcherExe, ardmExe);
    rmSync(launcherExe, { force: true });
    log("  ✅ launcher.exe → ARDM.exe");
  } else if (existsSync(ardmExe)) {
    log("  ⚠️ launcher.exe 不存在，ARDM.exe 已存在，跳过重命名");
  } else {
    warn("  ❌ 未找到 launcher.exe 或 ARDM.exe");
  }

  // ── Step 5: rcedit 嵌入图标 ─────────────────────────────────────────────
  log("Step 5: 嵌入图标");

  if (existsSync(ardmExe) && existsSync(ICON_PATH)) {
    const rceditPath = join(
      ROOT,
      "node_modules",
      "rcedit",
      "bin",
      "rcedit-x64.exe"
    );
    if (existsSync(rceditPath)) {
      try {
        await run([
          rceditPath,
          ardmExe,
          "--set-icon",
          ICON_PATH,
        ]);
        log("  ✅ 图标嵌入 ARDM.exe 成功");
      } catch (e) {
        warn(`图标嵌入失败: ${e}`);
      }
    } else {
      warn(`rcedit 未找到: ${rceditPath}`);
    }

    // 也尝试给 bun.exe 嵌图标
    const bunExe = join(binDir, "bun.exe");
    if (existsSync(bunExe) && existsSync(rceditPath)) {
      try {
        await run([rceditPath, bunExe, "--set-icon", ICON_PATH]);
        log("  ✅ 图标嵌入 bun.exe 成功");
      } catch {}
    }
  } else {
    warn(`ARDM.exe 或图标文件未找到，跳过图标嵌入`);
  }

  // ── Step 6: 清理杂文件 ──────────────────────────────────────────────────
  log("Step 6: 清理杂文件");

  const trashFiles = [
    "Info.plist",
    "ARDM-Setup.exe", // 安装器，不打包进便携版
  ];

  for (const f of trashFiles) {
    const fp = join(destPath, f);
    if (existsSync(fp)) {
      rmSync(fp, { force: true });
    }
  }

  // ── Step 7: 验证文件结构 ────────────────────────────────────────────────
  log("Step 7: 验证文件结构");

  const requiredFiles = [
    join("bin", "ARDM.exe"),
    join("bin", "bun.exe"),
    join("bin", "WebView2Loader.dll"),
  ];

  for (const relPath of requiredFiles) {
    const fullPath = join(destPath, relPath);
    if (!existsSync(fullPath)) {
      warn(`缺少必需文件: ${relPath}`);
    } else {
      log(`  ✅ ${relPath}`);
    }
  }

  // ── Step 8: 打包 7z ────────────────────────────────────────────────────
  log(`Step 8: 打包 7z → dist/${destDirName}.7z`);

  const archivePath = join(DIST_DIR, `${destDirName}.7z`);

  // 在 destPath 目录内执行，确保 7z 根目录就是内容本身
  await run(["7z", "a", archivePath, ".", "-mx=9"], {
    cwd: destPath,
  });

  // 检查打包结果
  if (existsSync(archivePath)) {
    const st = statSync(archivePath);
    log(`✅ 打包完成: ${archivePath} (${(st.size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    error("打包失败：未生成 7z 文件");
    process.exit(1);
  }

  // 注意：不要清理 destPath（dist 下的便携包目录），下次构建 Step 1 会清理

  // ── Step 9: 清理 build/ 和 artifacts/ ──────────────────────────────────
  log("Step 9: 清理 build/ 和 artifacts/ 目录");
  for (const dir of [BUILD_DIR, ARTIFACTS_DIR]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  log("构建完成");
}

main().catch((e) => {
  error(e.message || String(e));
  process.exit(1);
});
