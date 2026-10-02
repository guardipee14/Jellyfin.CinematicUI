using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace Jellyfin.Plugin.CinematicUI;

public sealed class IndexInjectionStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.UseMiddleware<IndexInjectionMiddleware>();
            next(app);
        };
    }
}

public sealed class IndexInjectionMiddleware
{
    private const string Marker = "<!-- CINEMATIC-UI-INJECTED -->";
    private readonly RequestDelegate _next;

    private static readonly string[] KnownIndexPaths =
    {
        "/jellyfin/jellyfin-web/index.html",
        "/usr/share/jellyfin/web/index.html"
    };

    public IndexInjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    private static bool IsIndexRequest(PathString path)
    {
        var value = path.Value ?? string.Empty;
        return value.Equals("/web/index.html", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/web/", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/web", StringComparison.OrdinalIgnoreCase);
    }

    private static bool Enabled()
        => Plugin.Instance?.Configuration?.EnableInjection ?? true;

    private static string? FindIndexHtml()
        => KnownIndexPaths.FirstOrDefault(File.Exists);

    private static string Inject(string html)
    {
        if (html.Contains(Marker, StringComparison.Ordinal))
        {
            return html;
        }

        var css = EmbeddedAssets.Css;
        var js = EmbeddedAssets.ClientJs;
        var config = EmbeddedAssets.ConfigJson.Replace("</", "<\\/", StringComparison.Ordinal);

        var headPayload = $"\n{Marker}\n<style id=\"cinematic-ui-style\">{css}</style>\n";
        var bodyPayload = $"\n<script>window.CinematicUIConfig={config};</script>\n<script id=\"cinematic-ui-client\">{js}</script>\n";

        if (html.Contains("</head>", StringComparison.OrdinalIgnoreCase))
        {
            html = html.Replace("</head>", headPayload + "</head>", StringComparison.OrdinalIgnoreCase);
        }

        if (html.Contains("</body>", StringComparison.OrdinalIgnoreCase))
        {
            html = html.Replace("</body>", bodyPayload + "</body>", StringComparison.OrdinalIgnoreCase);
        }

        return html;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!Enabled() || !IsIndexRequest(context.Request.Path))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        // Avoid getting compressed bytes when falling back to response capture.
        context.Request.Headers.Remove("Accept-Encoding");

        var path = context.Request.Path.Value ?? string.Empty;
        var directServe = path.Equals("/web/index.html", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/web/", StringComparison.OrdinalIgnoreCase);

        if (directServe && (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)))
        {
            var indexPath = FindIndexHtml();
            if (indexPath is not null)
            {
                try
                {
                    var raw = await File.ReadAllTextAsync(indexPath).ConfigureAwait(false);
                    var output = Encoding.UTF8.GetBytes(Inject(raw));

                    context.Response.StatusCode = StatusCodes.Status200OK;
                    context.Response.ContentType = "text/html; charset=utf-8";
                    context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                    context.Response.Headers.Remove("ETag");
                    context.Response.Headers.Remove("Last-Modified");
                    context.Response.ContentLength = output.Length;

                    if (!HttpMethods.IsHead(context.Request.Method))
                    {
                        await context.Response.Body.WriteAsync(output).ConfigureAwait(false);
                    }

                    return;
                }
                catch
                {
                    // Fail open: fall back to the normal Jellyfin response.
                }
            }
        }

        var originalBodyFeature = context.Features.Get<IHttpResponseBodyFeature>();
        using var buffer = new MemoryStream();
        context.Features.Set<IHttpResponseBodyFeature>(new StreamResponseBodyFeature(buffer));

        try
        {
            await _next(context).ConfigureAwait(false);
        }
        finally
        {
            context.Features.Set(originalBodyFeature);
        }

        var bytes = buffer.ToArray();
        if (context.Response.StatusCode == StatusCodes.Status200OK)
        {
            try
            {
                var html = Encoding.UTF8.GetString(bytes);
                if (html.Contains("</body>", StringComparison.OrdinalIgnoreCase))
                {
                    bytes = Encoding.UTF8.GetBytes(Inject(html));
                    context.Response.ContentLength = bytes.Length;
                    context.Response.Headers.Remove("ETag");
                    context.Response.Headers.Remove("Last-Modified");
                    context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
                }
            }
            catch
            {
                // Keep original bytes.
            }
        }

        await context.Response.Body.WriteAsync(bytes).ConfigureAwait(false);
    }
}
