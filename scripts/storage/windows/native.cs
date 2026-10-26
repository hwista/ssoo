using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class SsooStorageNative {
    [StructLayout(LayoutKind.Sequential)] struct LastInput { public uint Size; public uint Tick; }
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LastInput input);
    public static uint IdleSeconds() {
        var input = new LastInput { Size = 8 };
        if (!GetLastInputInfo(ref input)) throw new Win32Exception();
        return unchecked((uint)Environment.TickCount - input.Tick) / 1000;
    }
    [StructLayout(LayoutKind.Sequential)] struct StorageType { public uint Device; public Guid Vendor; }
    [StructLayout(LayoutKind.Sequential)] struct OpenParameters { public uint Version; public uint Depth; }
    [StructLayout(LayoutKind.Sequential)] struct CompactParameters { public uint Version; public uint Reserved; }
    [DllImport("virtdisk.dll", CharSet = CharSet.Unicode)] static extern uint OpenVirtualDisk(
        ref StorageType type, string path, uint access, uint flags, ref OpenParameters parameters, out IntPtr handle);
    [DllImport("virtdisk.dll")] static extern uint CompactVirtualDisk(
        IntPtr handle, uint flags, ref CompactParameters parameters, IntPtr overlapped);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    public static void Compact(string path) {
        var type = new StorageType { Device = 3, Vendor = new Guid("ec984aec-a0f9-47e9-901f-71415a66345b") };
        var parameters = new OpenParameters { Version = 1, Depth = 1 };
        IntPtr handle;
        uint result = OpenVirtualDisk(ref type, path, 0x00200000, 0, ref parameters, out handle);
        if (result != 0) throw new Win32Exception((int)result);
        try {
            var compact = new CompactParameters { Version = 1 };
            result = CompactVirtualDisk(handle, 0, ref compact, IntPtr.Zero);
            if (result != 0) throw new Win32Exception((int)result);
        } finally { CloseHandle(handle); }
    }
}
