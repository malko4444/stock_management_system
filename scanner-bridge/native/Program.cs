using System.Text.Json;
using System.Text.Json.Serialization;

namespace ScannerHelper;

// Protocol: the Electron app writes one JSON object per line to stdin;
// we write one JSON object per line to stdout. Commands are idempotent.
//
// Supported commands:
//   { "cmd": "ping"                                        }
//   { "cmd": "isConnected"                                 }
//   { "cmd": "enroll",   "employeeId": "abc"               }
//   { "cmd": "identify"                                    }
//   { "cmd": "forget",   "employeeId": "abc"               }
//   { "cmd": "list"                                        }
//
// Every response has:
//   { "ok": true/false, ... }
// Errors include: { "ok": false, "error": "reason" }

public class CommandEnvelope
{
    [JsonPropertyName("cmd")] public string Cmd { get; set; } = "";
    [JsonPropertyName("employeeId")] public string? EmployeeId { get; set; }
}

public static class Program
{
    public static int Main()
    {
        // Single line readiness handshake so the parent knows we're up.
        Write(new { ok = true, event_ = "ready", version = "1.0.0" });

        string? line;
        while ((line = Console.In.ReadLine()) != null)
        {
            line = line.Trim();
            if (line.Length == 0) continue;

            try
            {
                var cmd = JsonSerializer.Deserialize<CommandEnvelope>(line);
                if (cmd == null) { Write(new { ok = false, error = "invalid JSON" }); continue; }
                Handle(cmd);
            }
            catch (Exception ex)
            {
                Write(new { ok = false, error = ex.Message });
            }
        }
        return 0;
    }

    private static void Handle(CommandEnvelope cmd)
    {
        switch (cmd.Cmd)
        {
            case "ping":
                Write(new { ok = true, pong = true });
                break;

            case "isConnected":
                try
                {
                    bool connected = WinBio.IsDeviceConnected();
                    Write(new { ok = true, connected });
                }
                catch (Exception ex)
                {
                    Write(new { ok = true, connected = false, error = ex.Message });
                }
                break;

            case "enroll":
                if (string.IsNullOrWhiteSpace(cmd.EmployeeId))
                {
                    Write(new { ok = false, error = "employeeId required" });
                    return;
                }
                try
                {
                    // Capture 3 samples and keep the best-extracting one.
                    // SourceAFIS is forgiving enough that 1 good sample
                    // is usually sufficient, but 3 is standard.
                    byte[]? bestTemplate = null;
                    for (int i = 0; i < 3; i++)
                    {
                        Write(new { ok = true, event_ = "awaiting_finger", sample = i + 1, total = 3 });
                        var (pixels, w, h) = WinBio.CaptureSample();
                        var t = Matcher.Extract(pixels, w, h);
                        if (bestTemplate == null || t.Length > bestTemplate.Length)
                            bestTemplate = t;
                    }
                    if (bestTemplate == null) throw new Exception("No template extracted");
                    Store.Save(cmd.EmployeeId, bestTemplate);
                    Write(new { ok = true, enrolled = true, employeeId = cmd.EmployeeId });
                }
                catch (Exception ex)
                {
                    Write(new { ok = false, error = ex.Message });
                }
                break;

            case "identify":
                try
                {
                    Write(new { ok = true, event_ = "awaiting_finger" });
                    var (pixels, w, h) = WinBio.CaptureSample();
                    var (empId, score) = Matcher.Identify(pixels, w, h);
                    if (empId == null)
                    {
                        Write(new { ok = true, matched = false });
                    }
                    else
                    {
                        Write(new { ok = true, matched = true, employeeId = empId, score });
                    }
                }
                catch (Exception ex)
                {
                    Write(new { ok = false, error = ex.Message });
                }
                break;

            case "forget":
                if (string.IsNullOrWhiteSpace(cmd.EmployeeId))
                {
                    Write(new { ok = false, error = "employeeId required" });
                    return;
                }
                Store.Delete(cmd.EmployeeId);
                Write(new { ok = true, forgotten = cmd.EmployeeId });
                break;

            case "list":
                var ids = Store.All().Select(x => x.employeeId).ToArray();
                Write(new { ok = true, enrolled = ids });
                break;

            default:
                Write(new { ok = false, error = "unknown command: " + cmd.Cmd });
                break;
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static void Write(object payload)
    {
        var json = JsonSerializer.Serialize(payload, JsonOpts);
        Console.Out.WriteLine(json);
        Console.Out.Flush();
    }
}
