using System.Runtime.InteropServices;

namespace ScannerHelper;

/// <summary>
/// Thin P/Invoke wrapper around winbio.dll. We use only the minimal
/// surface area we need: open session, capture a raw sample, close.
/// All fingerprint MATCHING happens in SourceAFIS (see Matcher.cs),
/// not in WinBio, so we don't depend on the vendor's match engine.
/// </summary>
public static class WinBio
{
    public const uint WINBIO_TYPE_FINGERPRINT = 0x00000008;
    public const uint WINBIO_POOL_SYSTEM = 1;
    public const uint WINBIO_FLAG_RAW = 0x00000001;
    public const uint WINBIO_FLAG_DEFAULT = 0x00000000;
    public const uint WINBIO_PURPOSE_VERIFY = 1;
    public const uint WINBIO_PURPOSE_IDENTIFY = 2;
    public const uint WINBIO_PURPOSE_ENROLL = 3;
    public const uint WINBIO_PURPOSE_ENROLL_FOR_VERIFICATION = 4;
    public const uint WINBIO_PURPOSE_ENROLL_FOR_IDENTIFICATION = 5;
    public const uint WINBIO_PURPOSE_AUDIT = 6;

    public const uint WINBIO_NO_SUBTYPE_AVAILABLE = 0x000000FF;
    public const uint WINBIO_SUBTYPE_ANY = 0x000000FF;

    [DllImport("winbio.dll", EntryPoint = "WinBioOpenSession", CharSet = CharSet.Unicode)]
    public static extern int WinBioOpenSession(
        uint Factor,
        uint PoolType,
        uint Flags,
        IntPtr UnitArray,
        uint UnitCount,
        IntPtr DatabaseId,
        out IntPtr SessionHandle);

    [DllImport("winbio.dll", EntryPoint = "WinBioCloseSession")]
    public static extern int WinBioCloseSession(IntPtr SessionHandle);

    [DllImport("winbio.dll", EntryPoint = "WinBioCaptureSample")]
    public static extern int WinBioCaptureSample(
        IntPtr SessionHandle,
        uint Purpose,
        uint Flags,
        out uint UnitId,
        out IntPtr Sample,
        out IntPtr SampleSize,
        out uint RejectDetail);

    [DllImport("winbio.dll", EntryPoint = "WinBioFree")]
    public static extern int WinBioFree(IntPtr Address);

    [DllImport("winbio.dll", EntryPoint = "WinBioEnumBiometricUnits")]
    public static extern int WinBioEnumBiometricUnits(
        uint Factor,
        out IntPtr UnitSchemaArray,
        out uint UnitCount);

    // Check whether at least one fingerprint unit is plugged in.
    // Some vendor drivers (e.g. ChipSailing WA28) answer for capture but
    // not for enumerate when running unelevated, so if enumerate reports
    // zero units we also try opening a session as a fallback check.
    // We try BOTH DEFAULT and RAW flags because some drivers only accept
    // one of them.
    public static bool IsDeviceConnected()
    {
        int hr = WinBioEnumBiometricUnits(WINBIO_TYPE_FINGERPRINT,
            out IntPtr schemaArray, out uint count);
        if (schemaArray != IntPtr.Zero) WinBioFree(schemaArray);
        if (hr == 0 && count > 0) return true;

        // Try RAW first (what CaptureSample uses), then DEFAULT.
        foreach (uint flag in new[] { WINBIO_FLAG_RAW, WINBIO_FLAG_DEFAULT })
        {
            int hr2 = WinBioOpenSession(
                WINBIO_TYPE_FINGERPRINT,
                WINBIO_POOL_SYSTEM,
                flag,
                IntPtr.Zero, 0, IntPtr.Zero,
                out IntPtr session);
            if (hr2 == 0)
            {
                WinBioCloseSession(session);
                return true;
            }
            Console.Error.WriteLine($"[winbio] probe flag=0x{flag:X} hr=0x{hr2:X8}");
        }
        Console.Error.WriteLine($"[winbio] enum hr=0x{hr:X8} count={count}");
        return false;
    }

    /// <summary>
    /// Capture one fingerprint sample. Returns a grayscale image buffer,
    /// width, and height. The caller (Matcher) converts to SourceAFIS
    /// template. Blocks until the user touches the sensor.
    /// </summary>
    public static (byte[] pixels, int width, int height) CaptureSample()
    {
        Console.Error.WriteLine("[winbio] opening session (RAW)...");
        int hr = WinBioOpenSession(
            WINBIO_TYPE_FINGERPRINT,
            WINBIO_POOL_SYSTEM,
            WINBIO_FLAG_RAW,
            IntPtr.Zero, 0, IntPtr.Zero,
            out IntPtr session);
        if (hr != 0)
        {
            // Fallback: some drivers refuse RAW but accept DEFAULT.
            Console.Error.WriteLine($"[winbio] RAW session failed 0x{hr:X8}, retrying DEFAULT...");
            hr = WinBioOpenSession(
                WINBIO_TYPE_FINGERPRINT,
                WINBIO_POOL_SYSTEM,
                WINBIO_FLAG_DEFAULT,
                IntPtr.Zero, 0, IntPtr.Zero,
                out session);
            if (hr != 0)
            {
                if ((uint)hr == 0x80070005)
                    throw new Exception("WinBio access denied (0x80070005). Run scanner-bridge as Administrator.");
                throw new Exception($"WinBioOpenSession failed: 0x{hr:X8}");
            }
        }
        Console.Error.WriteLine("[winbio] session opened. Waiting for finger...");

        try
        {
            hr = WinBioCaptureSample(
                session,
                WINBIO_PURPOSE_IDENTIFY,
                WINBIO_FLAG_RAW,
                out uint unit,
                out IntPtr samplePtr,
                out IntPtr sampleSize,
                out uint rejectDetail);

            if (hr != 0)
            {
                throw new Exception($"WinBioCaptureSample failed: 0x{hr:X8} (reject={rejectDetail})");
            }
            Console.Error.WriteLine($"[winbio] captured sample ({(int)sampleSize} bytes from unit {unit})");

            try
            {
                // The sample is a WINBIO_BIR structure. We parse the header
                // to find the raw image offset, width, and height.
                // Layout (simplified):
                //   WINBIO_BIR_HEADER (16 bytes) -> WINBIO_BDB (variable)
                //   The BDB for raw fingerprint starts with a
                //   WINBIO_BDB_ANSI_381_HEADER which contains the image
                //   dimensions.
                return ParseBir(samplePtr, (int)sampleSize);
            }
            finally
            {
                if (samplePtr != IntPtr.Zero) WinBioFree(samplePtr);
            }
        }
        finally
        {
            WinBioCloseSession(session);
        }
    }

    // WINBIO_BIR parsing. The format is defined in winbio_types.h.
    // Header: HeaderSize(2) | BirVersion(1) | BirDataType(1) | HeaderLength(4) ...
    // We skip the BIR header and look into the BDB, then the
    // ANSI-381 record to get width/height/image bytes.
    private static (byte[] pixels, int width, int height) ParseBir(IntPtr ptr, int totalSize)
    {
        byte[] raw = new byte[totalSize];
        Marshal.Copy(ptr, raw, 0, totalSize);

        // WINBIO_BIR_HEADER is 16 bytes; StandardDataBlock offset at +8
        // Fields (little-endian):
        //   ValidFields(4), HeaderVersion(1), DataType(1), DataSubtype(1),
        //   Purpose(1), DataQuality(1), reserved(3), ProductId(4) ...
        // Simplest reliable path: ANSI-381 header starts at the first
        // 0x46 0x49 0x52 marker ("FIR" = Fingerprint Image Record).
        for (int i = 0; i < raw.Length - 32; i++)
        {
            if (raw[i] == 0x46 && raw[i + 1] == 0x49 && raw[i + 2] == 0x52)
            {
                // ANSI-381 general record header (found "FIR")
                // Skip 26-byte fixed header, then per-view headers follow.
                // View header has: length(4) horizontalLineLength(2)
                // verticalLineLength(2) numberOfFingerViews(1) reserved(1)
                // then first finger view: fingerPosition(1) viewCount(1)
                // viewNumber(1) fingerQuality(1) impressionType(1)
                // then image data.
                int viewOff = i + 26;
                int width  = (raw[viewOff + 4] << 8) | raw[viewOff + 5];
                int height = (raw[viewOff + 6] << 8) | raw[viewOff + 7];
                int imageStart = viewOff + 14; // approximate
                int imageLen = width * height;
                if (imageStart + imageLen > raw.Length) continue;
                byte[] pixels = new byte[imageLen];
                Array.Copy(raw, imageStart, pixels, 0, imageLen);
                return (pixels, width, height);
            }
        }
        throw new Exception("Could not locate ANSI-381 fingerprint image in WINBIO_BIR. The scanner may use a different BDB format.");
    }
}
