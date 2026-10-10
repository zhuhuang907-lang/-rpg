// 历史模拟 RPG 启动器（沿用原 rpg-kernel 的 launcher/GameLauncher.cs，用 Windows 自带的 csc.exe 编译）
//
// 压缩包里的结构：
//   HistoryRPG\
//     HistoryRPG.exe        ← 本程序，双击它
//     runtime\node.exe      ← 自带的 Node 运行环境（电脑上不用另装）
//     game\server.js …      ← 游戏本体；存档在 game\saves，Key 在 game\data\config.json
//
// 双击后：
//   1. 关掉 3168 端口上残留的旧服务（只关 node 进程）；
//   2. 用 node 启动 game\server.js（不弹黑窗口，日志写到 game\data\server.log）；
//   3. 等服务就绪后，用 Edge / Chrome 的「应用模式」开一个独立窗口；
//   4. 关掉这个窗口，游戏服务随之退出。
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Windows.Forms;

static class GameLauncher
{
    const int PORT = 3168;
    static readonly string URL = "http://127.0.0.1:" + PORT + "/";
    static string AppDir = AppDomain.CurrentDomain.BaseDirectory;
    static string GameDir;
    static string LogPath;

    [STAThread]
    static void Main()
    {
        GameDir = Path.Combine(AppDir, "game");
        if (!File.Exists(Path.Combine(GameDir, "server.js")) && File.Exists(Path.Combine(AppDir, "server.js"))) GameDir = AppDir;
        LogPath = Path.Combine(GameDir, "data", "server.log");
        try { Directory.CreateDirectory(Path.Combine(GameDir, "data")); } catch { }

        if (!File.Exists(Path.Combine(GameDir, "server.js")))
        {
            Fail("找不到游戏文件（game\\server.js）。\n请把整个压缩包解压出来，再双击文件夹里的 HistoryRPG.exe。\n不要直接在压缩包里双击。");
            return;
        }
        string node = FindNode();
        if (node == null)
        {
            Fail("找不到 Node.js 运行环境（runtime\\node.exe）。\n请重新下载完整的压缩包并全部解压。");
            return;
        }

        KillOldServer();

        Process server;
        try
        {
            var psi = new ProcessStartInfo(node, "server.js")
            {
                WorkingDirectory = GameDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            };
            psi.EnvironmentVariables["PORT"] = PORT.ToString();
            psi.EnvironmentVariables["SHU_NO_BROWSER"] = "1";
            server = Process.Start(psi);
            var log = new StreamWriter(LogPath, false) { AutoFlush = true };
            server.OutputDataReceived += (s, e) => { if (e.Data != null) lock (log) log.WriteLine(e.Data); };
            server.ErrorDataReceived += (s, e) => { if (e.Data != null) lock (log) log.WriteLine("[err] " + e.Data); };
            server.BeginOutputReadLine();
            server.BeginErrorReadLine();
        }
        catch (Exception ex)
        {
            Fail("游戏服务启动失败：" + ex.Message);
            return;
        }

        // 等服务就绪（最多 40 秒）
        bool ready = false;
        for (int i = 0; i < 80 && !server.HasExited; i++)
        {
            if (Ping()) { ready = true; break; }
            Thread.Sleep(500);
        }
        if (!ready)
        {
            try { if (!server.HasExited) server.Kill(); } catch { }
            Fail("游戏服务没有正常启动。\n\n日志最后几行：\n" + TailLog(12));
            return;
        }

        // 独立窗口打开（Edge / Chrome 应用模式，用独立配置目录，窗口关闭时进程才会结束）
        string browser = FindBrowser();
        try
        {
            if (browser != null)
            {
                string profile = Path.Combine(GameDir, "data", "app-window");
                var ui = Process.Start(new ProcessStartInfo(browser,
                    "--app=" + URL + " --user-data-dir=\"" + profile + "\" --window-size=1280,860 --no-first-run --no-default-browser-check")
                { UseShellExecute = false });
                ui.WaitForExit();
            }
            else
            {
                Process.Start(URL);
                MessageBox.Show("游戏已在浏览器中打开。\n\n玩完点「确定」，关闭游戏服务。", "历史模拟",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        finally
        {
            try { if (!server.HasExited) server.Kill(); } catch { }
        }
    }

    static string FindNode()
    {
        foreach (var p in new[] { Path.Combine(AppDir, "runtime", "node.exe"), Path.Combine(AppDir, "node.exe") })
            if (File.Exists(p)) return p;
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
        {
            try { string p = Path.Combine(dir.Trim(), "node.exe"); if (File.Exists(p)) return p; } catch { }
        }
        string pf = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
        return File.Exists(pf) ? pf : null;
    }

    static string FindBrowser()
    {
        string[] c = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
        };
        return c.FirstOrDefault(File.Exists);
    }

    static bool Ping()
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(URL + "api/health");
            req.Timeout = 800; req.Proxy = null;
            using (var resp = (HttpWebResponse)req.GetResponse()) return resp.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }

    // 只关「占着端口的 node 进程」，不碰别的程序
    static void KillOldServer()
    {
        try
        {
            var psi = new ProcessStartInfo("netstat", "-ano -p tcp")
            { UseShellExecute = false, RedirectStandardOutput = true, CreateNoWindow = true };
            string outp;
            using (var p = Process.Start(psi)) { outp = p.StandardOutput.ReadToEnd(); p.WaitForExit(3000); }
            foreach (var line in outp.Split('\n'))
            {
                var parts = line.Split(new[] { ' ', '\t', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 5 || !parts[1].EndsWith(":" + PORT) || parts[3] != "LISTENING") continue;
                int pid; if (!int.TryParse(parts[4], out pid)) continue;
                try
                {
                    var proc = Process.GetProcessById(pid);
                    if (proc.ProcessName.ToLower().Contains("node")) { proc.Kill(); proc.WaitForExit(3000); }
                }
                catch { }
            }
        }
        catch { }
    }

    static string TailLog(int n)
    {
        try { return string.Join("\n", File.ReadAllLines(LogPath).Reverse().Take(n).Reverse()); }
        catch { return "（无日志）"; }
    }

    static void Fail(string msg)
    {
        MessageBox.Show(msg, "历史模拟 · 启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}
