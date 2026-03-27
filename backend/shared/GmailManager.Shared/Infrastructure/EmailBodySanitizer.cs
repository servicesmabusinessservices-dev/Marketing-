using Ganss.Xss;

namespace GmailManager.Shared.Infrastructure;

public static class EmailBodySanitizer
{
    private static readonly HtmlSanitizer Sanitizer = CreateSanitizer();

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();

        // Allow common email-safe tags
        sanitizer.AllowedTags.Add("br");
        sanitizer.AllowedTags.Add("p");
        sanitizer.AllowedTags.Add("b");
        sanitizer.AllowedTags.Add("i");
        sanitizer.AllowedTags.Add("u");
        sanitizer.AllowedTags.Add("strong");
        sanitizer.AllowedTags.Add("em");
        sanitizer.AllowedTags.Add("a");
        sanitizer.AllowedTags.Add("ul");
        sanitizer.AllowedTags.Add("ol");
        sanitizer.AllowedTags.Add("li");
        sanitizer.AllowedTags.Add("h1");
        sanitizer.AllowedTags.Add("h2");
        sanitizer.AllowedTags.Add("h3");
        sanitizer.AllowedTags.Add("div");
        sanitizer.AllowedTags.Add("span");
        sanitizer.AllowedTags.Add("img");
        sanitizer.AllowedTags.Add("table");
        sanitizer.AllowedTags.Add("thead");
        sanitizer.AllowedTags.Add("tbody");
        sanitizer.AllowedTags.Add("tr");
        sanitizer.AllowedTags.Add("td");
        sanitizer.AllowedTags.Add("th");
        sanitizer.AllowedTags.Add("pre");
        sanitizer.AllowedTags.Add("blockquote");
        sanitizer.AllowedTags.Add("hr");
        sanitizer.AllowedAttributes.Add("style");
        sanitizer.AllowedAttributes.Add("href");
        sanitizer.AllowedAttributes.Add("src");
        sanitizer.AllowedAttributes.Add("alt");
        sanitizer.AllowedAttributes.Add("class");
        sanitizer.AllowedAttributes.Add("target");
        sanitizer.AllowedAttributes.Add("width");
        sanitizer.AllowedAttributes.Add("height");
        sanitizer.AllowedSchemes.Add("https");
        sanitizer.AllowedSchemes.Add("http");
        sanitizer.AllowedSchemes.Add("mailto");
        sanitizer.AllowedSchemes.Add("data");

        return sanitizer;
    }

    public static string Sanitize(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
            return string.Empty;

        return Sanitizer.Sanitize(html);
    }
}
