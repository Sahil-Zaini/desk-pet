# Desk Pet helper: prints the visible top-level windows (top of the z-order first) as JSON, about once a second.
# Each item: [handle, left, top, right, bottom] in physical screen pixels. Arg 0 = Desk Pet's process id (skipped).
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class DeskPetWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static void Aware() { try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {} }
  public static string Scan(uint self) {
    var sb = new StringBuilder("["); bool first = true;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || IsIconic(h) || GetWindowTextLength(h) == 0) return true;
      uint pid; GetWindowThreadProcessId(h, out pid); if (pid == self) return true;
      int ex = GetWindowLong(h, -20); if ((ex & 0x80) != 0) return true;           // tool windows
      int cloaked = 0; DwmGetWindowAttribute(h, 14, out cloaked, 4); if (cloaked != 0) return true;
      RECT r; if (DwmGetWindowAttribute(h, 9, out r, 16) != 0) return true;         // visible frame bounds
      if (r.R - r.L < 160 || r.B - r.T < 100) return true;
      if (!first) sb.Append(","); first = false;
      sb.Append("[" + h.ToInt64() + "," + r.L + "," + r.T + "," + r.R + "," + r.B + "," + (IsZoomed(h) ? 1 : 0) + "]");
      return true; }, IntPtr.Zero);
    return sb.Append("]").ToString();
  }
}
"@
[DeskPetWin]::Aware()
$self = [uint32]$args[0]
while ($true) {
  try { [Console]::Out.WriteLine([DeskPetWin]::Scan($self)); [Console]::Out.Flush() } catch { }
  Start-Sleep -Milliseconds 800
}
