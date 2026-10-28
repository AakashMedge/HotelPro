using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Drawing.Printing;
using System.Collections.Generic;

namespace HotelProSpooler {
    class Program {
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

        [DllImport("winspool.Drv", EntryPoint = "GetPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool GetPrinter(IntPtr hPrinter, int dwLevel, IntPtr pPrinter, int cbBuf, out int pcbNeeded);

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

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public struct PRINTER_INFO_2 {
            public string pServerName;
            public string pPrinterName;
            public string pShareName;
            public string pPortName;
            public string pDriverName;
            public string pComment;
            public string pLocation;
            public IntPtr pDevMode;
            public string pSepFile;
            public string pPrintProcessor;
            public string pDatatype;
            public string pParameters;
            public IntPtr pSecurityDescriptor;
            public uint Attributes;
            public uint Priority;
            public uint DefaultPriority;
            public uint StartTime;
            public uint UntilTime;
            public uint Status;
            public uint cJobs;
            public uint AveragePPM;
        }

        public class PrinterCandidate {
            public string Name;
            public string Port;
            public bool IsError;
            public bool IsOffline;
            public uint JobCount;
            public int Score; // Lower is better
        }

        public static PrinterCandidate EvaluatePrinter(string printerName) {
            PrinterCandidate cand = new PrinterCandidate {
                Name = printerName,
                Port = "",
                IsError = false,
                IsOffline = false,
                JobCount = 0,
                Score = 50
            };

            IntPtr hPrinter;
            if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
                cand.IsError = true;
                cand.Score = 999;
                return cand;
            }

            int needed = 0;
            GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out needed);
            if (needed > 0) {
                IntPtr pBuf = Marshal.AllocHGlobal(needed);
                try {
                    if (GetPrinter(hPrinter, 2, pBuf, needed, out needed)) {
                        PRINTER_INFO_2 info = (PRINTER_INFO_2)Marshal.PtrToStructure(pBuf, typeof(PRINTER_INFO_2));
                        cand.Port = info.pPortName ?? "";
                        cand.JobCount = info.cJobs;
                        cand.IsOffline = (info.Attributes & 0x00000400) != 0; // PRINTER_ATTRIBUTE_WORK_OFFLINE
                        cand.IsError = (info.Status & 0x00000002) != 0;     // PRINTER_STATUS_ERROR

                        if (cand.IsError || cand.IsOffline) {
                            cand.Score = 500 + (int)cand.JobCount;
                        } else {
                            cand.Score = (int)cand.JobCount; // 0 jobs = score 0 (best)
                        }
                    }
                } catch { }
                finally {
                    Marshal.FreeHGlobal(pBuf);
                }
            }
            ClosePrinter(hPrinter);
            return cand;
        }

        public static List<PrinterCandidate> GetRankedThermalPrinters() {
            List<PrinterCandidate> list = new List<PrinterCandidate>();
            try {
                foreach (string p in PrinterSettings.InstalledPrinters) {
                    string lower = p.ToLower();
                    if (lower.Contains("pos") || lower.Contains("xp") || lower.Contains("thermal") || lower.Contains("receipt")) {
                        list.Add(EvaluatePrinter(p));
                    }
                }
            } catch { }

            // Sort: best healthy printer first (Score 0, not in error, not offline)
            list.Sort((a, b) => a.Score.CompareTo(b.Score));
            return list;
        }

        public static string DetectPrinter() {
            var candidates = GetRankedThermalPrinters();
            if (candidates.Count > 0) {
                // Return best ranked printer
                return candidates[0].Name;
            }
            try {
                PrinterSettings ps = new PrinterSettings();
                if (!string.IsNullOrEmpty(ps.PrinterName)) return ps.PrinterName;
            } catch { }
            return "POS58 Printer";
        }

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

        static int Main(string[] args) {
            if (args.Length < 1) {
                Console.WriteLine("Usage: RawPrinter.exe <Base64Data> [OptionalPrinterName]");
                return 1;
            }

            string base64 = args[0];
            string requestedPrinter = (args.Length > 1 && !string.IsNullOrEmpty(args[1])) ? args[1] : "auto";

            try {
                byte[] bytes = Convert.FromBase64String(base64);

                // 1. If a specific printer was requested and is NOT auto, check if healthy
                if (requestedPrinter != "auto") {
                    var cand = EvaluatePrinter(requestedPrinter);
                    if (!cand.IsError && !cand.IsOffline) {
                        if (SendBytes(requestedPrinter, bytes)) {
                            Console.WriteLine("SUCCESS: Printed to " + requestedPrinter);
                            return 0;
                        }
                    }
                }

                // 2. Auto-detect or fallback to ranked healthy thermal printers
                var ranked = GetRankedThermalPrinters();
                foreach (var candidate in ranked) {
                    if (candidate.IsError || candidate.IsOffline) continue; // Skip error/offline queues!

                    if (SendBytes(candidate.Name, bytes)) {
                        Console.WriteLine("SUCCESS: Printed to " + candidate.Name);
                        return 0;
                    }
                }

                // 3. Fallback: Try any thermal printer if all had issues
                if (ranked.Count > 0) {
                    string lastResort = ranked[0].Name;
                    if (SendBytes(lastResort, bytes)) {
                        Console.WriteLine("SUCCESS: Printed to " + lastResort);
                        return 0;
                    }
                }

                Console.WriteLine("ERROR: No healthy thermal printer available");
                return 1;
            } catch (Exception ex) {
                Console.WriteLine("ERROR: " + ex.Message);
                return 1;
            }
        }
    }
}
