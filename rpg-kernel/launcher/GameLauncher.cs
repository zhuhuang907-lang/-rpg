// 历史模拟 RPG 启动器（Windows 自带 csc.exe 编译，无需安装任何东西）
//
// 双击后：
//   1. 立刻弹出一个小窗「历史模拟 RPG」——游戏运行期间它一直在，关掉它就退出游戏；
//   2. 检查是不是在压缩包里直接运行（那样找不到文件），是的话提示先解压；
//   3. 关掉端口上残留的旧服务（只关 node 进程），端口被别的程序占了就换一个；
//   4. 用自带的 runtime\node.exe 启动游戏服务（无黑窗口，日志写到 data\server.log）；
//   5. 服务就绪后用电脑的默认浏览器打开游戏页面；小窗上有「打开游戏」按钮，浏览器关了可以再开。
// 启动过程写到 data\launcher.log，出问题时把它发给我。
// 目录：游戏文件可以和本程序放在一起，也可以放在旁边的 app 文件夹里（压缩包版就是这样）。
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
    static string GameDir;
    static string LogPath, LauncherLog;
    static Form Win;
    static Label Info;
    static Button BtnOpen, BtnQuit;
    static Process Server;
    static bool Ready;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        GameDir = File.Exists(Path.Combine(AppDir, "server.js")) ? AppDir : Path.Combine(AppDir, "app");
        try { Directory.CreateDirectory(Path.Combine(GameDir, "data")); } catch { }
        LogPath = Path.Combine(GameDir, "data", "server.log");
        LauncherLog = Path.Combine(GameDir, "data", "launcher.log");
        try { File.WriteAllText(LauncherLog, ""); } catch { }
        Log("启动器：" + AppDir + "　游戏目录：" + GameDir);

        Win = new Form
        {
            Text = TITLE, Width = 460, Height = 210, StartPosition = FormStartPosition.CenterScreen,
            FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false,
        };
        try { Win.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        Info = new Label
        {
            Left = 16, Top = 14, Width = 412, Height = 90, Font = new Font("Microsoft YaHei UI", 10.5f),
            Text = "正在启动游戏……",
        };
        BtnOpen = new Button { Text = "打开游戏", Left = 16, Top = 112, Width = 150, Height = 36, Enabled = false, Font = new Font("Microsoft YaHei UI", 10f) };
        BtnQuit = new Button { Text = "退出游戏", Left = 278, Top = 112, Width = 150, Height = 36, Font = new Font("Microsoft YaHei UI", 10f) };
        BtnOpen.Click += (s, e) => OpenBrowser();
        BtnQuit.Click += (s, e) => Win.Close();
        Win.Controls.Add(Info); Win.Controls.Add(BtnOpen); Win.Controls.Add(BtnQuit);
        Win.Shown += (s, e) => new Thread(Run) { IsBackground = true }.Start();
        Application.Run(Win);
        StopServer();
    }

    static void Run()
    {
        try { RunInner(); }
        catch (Exception ex)
        {
            Log("异常：" + ex);
            Fail("启动时出错：" + ex.Message + "\n\n详细记录在 app\\data\\launcher.log");
        }
    }

    static void RunInner()
    {
        // 从压缩包里直接双击：Windows 只把 exe 解到临时目录，旁边没有游戏文件
        string lower = AppDir.ToLowerInvariant();
        if (!File.Exists(Path.Combine(GameDir, "server.js")))
        {
            if (lower.Contains("\\temp\\") || lower.Contains(".zip"))
                Fail("看起来你是在压缩包里直接双击的。\n\n请先在压缩包上点右键 →「全部解压缩」，\n再打开解压出来的文件夹，双击里面的「启动游戏.exe」。\n（更省事：下载「安装程序」那个文件，双击安装即可。）");
            else
                Fail("找不到游戏文件（server.js）。\n请保持文件夹完整，不要单独把「启动游戏.exe」拿出来；或者重新下载安装程序。");
            return;
        }
        string node = FindNode();
        Log("node：" + (node ?? "（没找到）"));
        if (node == null)
        {
            Fail("找不到游戏自带的运行环境（runtime\\node.exe）。\n可能被杀毒软件删掉了：请把游戏文件夹加入杀毒软件的信任区，然后重新下载安装。");
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
            WorkingDirectory = GameDir, UseShellExecute = false, CreateNoWindow = true,
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

        for (int i = 0; i < 120 && !Server.HasExited; i++)
        {
            if (Ping()) { Ready = true; break; }
            if (i == 10) Say("第一次启动稍慢（杀毒软件可能在扫描），请稍等……");
            Thread.Sleep(500);
        }
        Log("服务就绪：" + Ready + "，端口 " + Port);
        if (!Ready)
        {
            Thread.Sleep(300);
            Fail("游戏服务没有正常启动。\n\n日志最后几行：\n" + TailLog(12) +
                "\n\n常见原因：杀毒软件拦住了游戏自带的 node.exe——请把游戏文件夹加入信任后再试。");
            return;
        }

        Ui(() =>
        {
            Info.Text = "游戏正在运行。\n已在浏览器里打开：" + Url +
                "\n浏览器关了可以点「打开游戏」再开。玩完点「退出游戏」（进度自动保存）。";
            BtnOpen.Enabled = true;
        });
        OpenBrowser();
    }

    static void OpenBrowser()
    {
        try { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); Log("已用默认浏览器打开"); }
        catch (Exception ex)
        {
            Log("默认浏览器打开失败：" + ex.Message);
            // 没有默认浏览器关联时，直接找 Edge
            try
            {
                string edge = new[] {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                }.FirstOrDefault(File.Exists);
                if (edge != null) Process.Start(edge, Url);
                else Ui(() => Info.Text = "请手动打开浏览器，访问：" + Url);
            }
            catch { Ui(() => Info.Text = "请手动打开浏览器，访问：" + Url); }
        }
    }

    static void StopServer()
    {
        // 连同子进程一起关（游戏服务会带着联网开关重启自己一次）
        try
        {
            if (Server != null && !Server.HasExited)
            {
                var k = Process.Start(new ProcessStartInfo("taskkill", "/T /F /PID " + Server.Id) { UseShellExecute = false, CreateNoWindow = true });
                if (k != null) k.WaitForExit(5000);
                if (!Server.HasExited) Server.Kill();
            }
        }
        catch { }
    }

    static string FindNode()
    {
        foreach (var p in new[] {
            Path.Combine(GameDir, "runtime", "node.exe"), Path.Combine(AppDir, "runtime", "node.exe"),
            Path.Combine(GameDir, "node.exe"), Path.Combine(AppDir, "node.exe") })
            if (File.Exists(p)) return p;
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
        {
            try { string p = Path.Combine(dir.Trim(), "node.exe"); if (File.Exists(p)) return p; } catch { }
        }
        string pf = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
        return File.Exists(pf) ? pf : null;
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

    static void Say(string s) { Log(s); Ui(() => Info.Text = s); }

    static void Ui(Action a)
    {
        try { if (Win != null && Win.IsHandleCreated) Win.Invoke(a); } catch { }
    }

    static void Fail(string msg)
    {
        Log("失败：" + msg);
        Ui(() => { Info.Text = "启动失败，详见弹窗。"; MessageBox.Show(Win, msg, TITLE + " · 启动失败", MessageBoxButtons.OK, MessageBoxIcon.Error); Win.Close(); });
    }
}
