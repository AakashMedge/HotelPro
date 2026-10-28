 param(
    [string]$PrinterName = "",
    [string]$Base64Data = "",
    [string]$FilePath = ""
)

$code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytes(string szPrinterName, byte[] bytes) {
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
        IntPtr hPrinter;
        if (!OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            Marshal.FreeCoTaskMem(pUnmanagedBytes);
            return false;
        }
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "HotelPro Receipt";
        di.pDataType = "RAW";
        bool success = false;
        if (StartDocPrinter(hPrinter, 1, di)) {
            if (StartPagePrinter(hPrinter)) {
                int written = 0;
                success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
                EndPagePrinter(hPrinter);
            }
            EndDocPrinter(hPrinter);
        }
        ClosePrinter(hPrinter);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return success;
    }
}
"@

try {
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
} catch {
    # Type might already be added in current session
}

# If no printer name provided, auto-detect first thermal/POS printer or default printer
if (-not $PrinterName) {
    $found = Get-Printer | Where-Object { $_.Name -like "*POS58*" -or $_.Name -like "*POS*" -or $_.Name -like "*XP*" -or $_.Name -like "*Thermal*" } | Select-Object -First 1
    if ($found) {
        $PrinterName = $found.Name
    } else {
        $def = Get-Printer | Where-Object { $_.Default -eq $true } | Select-Object -First 1
        if ($def) { $PrinterName = $def.Name } else { $PrinterName = "POS58 Printer" }
    }
}

$bytes = @()
if ($FilePath -and (Test-Path $FilePath)) {
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
} elseif ($Base64Data) {
    $bytes = [System.Convert]::FromBase64String($Base64Data)
}

if ($bytes.Length -eq 0) {
    Write-Output "ERROR: No data to print"
    exit 1
}

$ok = [RawPrinterHelper]::SendBytes($PrinterName, $bytes)
if ($ok) {
    Write-Output "SUCCESS: Printed to $PrinterName"
    exit 0
} else {
    Write-Output "FAILED: Could not write to $PrinterName"
    exit 2
}
