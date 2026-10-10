// 历史模拟 RPG 启动器（Windows 自带 csc.exe 编译，无需安装任何东西）
//
// 双击后：
//   1. 立刻弹出「正在启动」小窗——不会再出现「双击没反应」；
//   2. 检查是不是在压缩包里直接运行（那样找不到文件），是的话提示先解压；
//   3. 关掉端口上残留的旧服务（只关 node 进程），端口被别的程序占了就换一个；
//   4. 用自带的 runtime\node.exe 启动 server.js（无黑窗口，日志写到 data\server.log）；
//   5. 用 Edge/Chrome 的「应用模式」开一个独立窗口；浏览器若立刻退出（已在运行、被拦截），
//      改用默认浏览器打开，并留一个「游戏运行中」小窗，关掉它才结束游戏服务。
// 启动过程写到 data\launcher.log，出问题时把它发给我。
// 编译：见 launcher\build.bat
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

static class GameLauncher
{
    const string TITLE = "历史模拟 RPG";
    static int Port = 8787;
    static string Url { get { return "http://127.0.0.1:" + Port + "/"; } }
    static string AppDir = AppDomain.CurrentDomain.BaseDirectory;
    static string LogPath, LauncherLog;
    static Form Splash;
    static Label SplashText;
    static Process Server;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        try { Directory.CreateDirectory(Path.Combine(AppDir, "data")); } catch { }
        LogPath = Path.Combine(AppDir, "data", "server.log");
        LauncherLog = Path.Combine(AppDir, "data", "launcher.log");
        try { File.WriteAllText(LauncherLog, ""); } catch { }
        Log("启动器：" + AppDir);

        Splash = new Form
        {
            Text = TITLE, Width = 420, Height = 150, StartPosition = FormStartPosition.CenterScreen,
            FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false, TopMost = true,
        };
        try { Splash.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        SplashText = new Label
        {
            Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Microsoft YaHei UI", 11f), Text = "正在启动游戏……",
        };
        Splash.Controls.Add(SplashText);
        Splash.Shown += (s, e) => new Thread(Run) { IsBackground = true }.Start();
        Application.Run(Splash);
        StopServer();
    }

    static void Run()
    {
        try { RunInner(); }
        catch (Exception ex)
        {
            Log("异常：" + ex);
            Fail("启动时出错：" + ex.Message + "\n\n详细记录在 data\\launcher.log");
        }
        Ui(() => Splash.Close());
    }

    static void RunInner()
    {
        // 从压缩包里直接双击：Windows 只把 exe 解到临时目录，旁边没有游戏文件
        string lower = AppDir.ToLowerInvariant();
        if (!File.Exists(Path.Combine(AppDir, "server.js")))
        {
            if (lower.Contains("\\temp\\") || lower.Contains(".zip"))
                Fail("看起来你是在压缩包里直接双击的。\n\n请先在压缩包上点右键 →「全部解压缩」，\n再打开解压出来的文件夹，双击里面的「启动游戏.exe」。");
            else
                Fail("找不到 server.js。\n请保持解压后的文件夹完整，不要单独把 exe 拿出来。");
            return;
        }
        string node = FindNode();
        Log("node：" + (node ?? "（没找到）"));
        if (node == null)
        {
            Fail("找不到 Node.js 运行环境（runtime\\node.exe）。\n请重新下载完整的游戏压缩包并解压；或安装 Node.js 22（https://nodejs.org）。");
            return;
        }

        Say("清理上次没关掉的游戏服务……");
        KillOldServer(Port);
        if (!PortFree(Port))
        {
            for (int p = 8788; p < 8800; p++) if (PortFree(p)) { Port = p; break; }
            Log("8787 被占用，改用 " + Port);
        }

        Say("启动游戏服务……");
        var psi = new ProcessStartInfo(node, "server.js")
        {
            WorkingDirectory = AppDir, UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardOutput = true, RedirectStandardError = true,
        };
        psi.EnvironmentVariables["PORT"] = Port.ToString();
        psi.EnvironmentVariables["SHU_NO_BROWSER"] = "1";
        Server = Process.Start(psi);
        var log = new StreamWriter(LogPath, false) { AutoFlush = true };
        Server.OutputDataReceived += (s, e) => { if (e.Data != null) lock (log) log.WriteLine(e.Data); };
        Server.ErrorDataReceived += (s, e) => { if (e.Data != null) lock (log) log.WriteLine("[err] " + e.Data); };
        Server.BeginOutputReadLine();
        Server.BeginErrorReadLine();

        bool ready = false;
        for (int i = 0; i < 120 && !Server.HasExited; i++)
        {
            if (Ping()) { ready = true; break; }
            if (i == 10) Say("第一次启动稍慢（杀毒软件可能在扫描），请稍等……");
            Thread.Sleep(500);
        }
        Log("服务就绪：" + ready + "，端口 " + Port);
        if (!ready)
        {
            Thread.Sleep(300);
            Fail("游戏服务没有正常启动。\n\n日志最后几行：\n" + TailLog(12) + "\n\n（日志在 data\\server.log）");
            return;
        }

        Say("打开游戏窗口……");
        string browser = FindBrowser();
        Log("浏览器：" + (browser ?? "（用默认浏览器）"));
        bool appWindowWorked = false;
        if (browser != null)
        {
            try
            {
                string profile = Path.Combine(AppDir, "data", "app-window");
                var t0 = DateTime.Now;
                var ui = Process.Start(new ProcessStartInfo(browser,
                    "--app=" + Url + " --user-data-dir=\"" + profile + "\" --window-size=1280,860 --no-first-run --no-default-browser-check")
                { UseShellExecute = false });
                Ui(() => Splash.Hide());
                ui.WaitForExit();
                // 正常情况下窗口开着就一直等；几秒内就退出，说明它把页面交给了别的浏览器进程或被拦截
                appWindowWorked = (DateTime.Now - t0).TotalSeconds > 8;
                Log("应用窗口退出，用时 " + (DateTime.Now - t0).TotalSeconds.ToString("0.0") + " 秒");
            }
            catch (Exception ex) { Log("应用窗口失败：" + ex.Message); }
        }
        if (appWindowWorked) return;

        try { Process.Start(Url); } catch (Exception ex) { Log("默认浏览器失败：" + ex.Message); }
        Ui(() => Splash.Hide());
        MessageBox.Show("游戏正在运行，已在浏览器里打开。\n\n如果浏览器没有自动打开，请手动访问：\n" + Url +
            "\n\n玩完后点「确定」结束游戏（进度会自动保存）。", TITLE, MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    static void StopServer()
    {
        try { if (Server != null && !Server.HasExited) Server.Kill(); } catch { }
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
            var req = (HttpWebRequest)WebRequest.Create(Url + "api/health");
            req.Timeout = 800; req.Proxy = null;
            using (var resp = (HttpWebResponse)req.GetResponse()) return resp.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }

    static bool PortFree(int port)
    {
        try { var l = new TcpListener(IPAddress.Loopback, port); l.Start(); l.Stop(); return true; }
        catch { return false; }
    }

    // 只关「占着端口的 node 进程」，不碰别的程序
    static void KillOldServer(int port)
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
                if (parts.Length < 5 || !parts[1].EndsWith(":" + port) || parts[3] != "LISTENING") continue;
                int pid; if (!int.TryParse(parts[4], out pid)) continue;
                try
                {
                    var proc = Process.GetProcessById(pid);
                    if (proc.ProcessName.ToLower().Contains("node")) { proc.Kill(); proc.WaitForExit(3000); Log("关掉旧服务 pid " + pid); }
                }
                catch { }
            }
        }
        catch { }
    }

    static string TailLog(int n)
    {
        try
        {
            using (var fs = new FileStream(LogPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var sr = new StreamReader(fs))
                return string.Join("\n", sr.ReadToEnd().Split('\n').Reverse().Take(n).Reverse());
        }
        catch { return "（无日志）"; }
    }

    static void Log(string s)
    {
        try { File.AppendAllText(LauncherLog, DateTime.Now.ToString("HH:mm:ss ") + s + Environment.NewLine); } catch { }
    }

    static void Say(string s) { Log(s); Ui(() => SplashText.Text = s); }

    static void Ui(Action a)
    {
        try { if (Splash != null && Splash.IsHandleCreated) Splash.Invoke(a); } catch { }
    }

    static void Fail(string msg)
    {
        Log("失败：" + msg);
        Ui(() => Splash.Hide());
        MessageBox.Show(msg, TITLE + " · 启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}
