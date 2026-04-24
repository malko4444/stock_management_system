using System.Text.Json;
using SourceAFIS;

namespace ScannerHelper;

/// <summary>
/// Local store for fingerprint templates. Templates stay on THIS PC -
/// only the employeeId gets synced to Firebase.
/// </summary>
public static class Store
{
    private static readonly string Dir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "StockManagerScannerBridge", "templates");

    static Store()
    {
        Directory.CreateDirectory(Dir);
    }

    public static void Save(string employeeId, byte[] template)
    {
        File.WriteAllBytes(Path.Combine(Dir, Safe(employeeId) + ".sfpt"), template);
    }

    public static void Delete(string employeeId)
    {
        var path = Path.Combine(Dir, Safe(employeeId) + ".sfpt");
        if (File.Exists(path)) File.Delete(path);
    }

    public static IEnumerable<(string employeeId, byte[] template)> All()
    {
        foreach (var path in Directory.GetFiles(Dir, "*.sfpt"))
        {
            yield return (Path.GetFileNameWithoutExtension(path), File.ReadAllBytes(path));
        }
    }

    private static string Safe(string id) => string.Concat(id.Where(c =>
        char.IsLetterOrDigit(c) || c == '_' || c == '-'));
}

public static class Matcher
{
    // Minimum match score to accept. SourceAFIS uses a 0-100+ scale;
    // 40 is a typical threshold recommended by the library.
    public const double Threshold = 40;

    public static byte[] Extract(byte[] grayscale, int width, int height)
    {
        var img = new FingerprintImage(width, height, grayscale);
        var template = new FingerprintTemplate(img);
        return template.ToByteArray();
    }

    public static (string? employeeId, double score) Identify(byte[] grayscale, int width, int height)
    {
        var probe = new FingerprintTemplate(new FingerprintImage(width, height, grayscale));
        var m = new FingerprintMatcher(probe);

        string? bestId = null;
        double bestScore = 0;
        foreach (var (employeeId, template) in Store.All())
        {
            try
            {
                var candidate = new FingerprintTemplate(template);
                double score = m.Match(candidate);
                if (score >= Threshold && score > bestScore)
                {
                    bestScore = score;
                    bestId = employeeId;
                }
            }
            catch { /* skip corrupt template */ }
        }
        return (bestId, bestScore);
    }
}
