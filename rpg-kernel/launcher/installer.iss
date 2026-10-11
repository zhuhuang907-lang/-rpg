; 历史模拟 RPG 安装程序（Inno Setup 6）
; 双击安装：不用管理员权限，装到「本机用户的 AppData\Local\HistoryRPG」，桌面和开始菜单各放一个图标。
; 升级时直接再装一遍：存档（app\data\saves）和 Key（app\data\adapter-config.json）不在安装包里，不会被覆盖。
#define AppName "历史模拟RPG"
#ifndef SrcDir
  #define SrcDir "..\..\dist\HistoryRPG"
#endif
#ifndef OutDir
  #define OutDir "..\..\dist"
#endif

[Setup]
AppId={{6B8F3C2E-4D1A-4E7B-9C55-2A7E1F0B9D31}
AppName={#AppName}
AppVersion=1.0
AppPublisher=history-rpg
DefaultDirName={localappdata}\HistoryRPG
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir={#OutDir}
OutputBaseFilename=HistoryRPG-Setup
SetupIconFile=game.ico
UninstallDisplayIcon={app}\启动游戏.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes

[Languages]
#if FileExists(AddBackslash(CompilerPath) + "Languages\ChineseSimplified.isl")
Name: "zh"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
#else
Name: "en"; MessagesFile: "compiler:Default.isl"
#endif

[Files]
Source: "{#SrcDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\启动游戏.exe"; WorkingDir: "{app}"
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\启动游戏.exe"; WorkingDir: "{app}"
Name: "{autoprograms}\{#AppName} 使用说明"; Filename: "{app}\使用说明.txt"

[Run]
Filename: "{app}\启动游戏.exe"; Description: "现在就开始玩"; Flags: postinstall nowait skipifsilent
; 游戏里点「一键更新」时是静默安装：装完自动把游戏重新打开
Filename: "{app}\启动游戏.exe"; Flags: nowait; Check: RelaunchAfterSilent

[Code]
// 静默安装（游戏内一键更新）装完重新打开游戏；打包机上测试安装时传 /NOLAUNCH，不打开
function RelaunchAfterSilent(): Boolean;
var i: Integer;
begin
  Result := WizardSilent();
  for i := 1 to ParamCount do
    if CompareText(ParamStr(i), '/NOLAUNCH') = 0 then Result := False;
end;
