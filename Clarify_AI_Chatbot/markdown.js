function renderMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    html = html.replace(/^---$/gm, "<hr>");
    
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    
    html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

    html = html.replace(/(^[\t ]*[-*] .+\n?)+/gm, (block) => {
        const items = block.trim().split("\n").map((line) => {
            return "<li>" + line.replace(/^[\t ]*[-*] /, "") + "</li>";
        });
        return "<ul>" + items.join("") + "</ul>";
    });

    html = html.replace(/(^\d+\. .+\n?)+/gm, (block) => {
        const items = block.trim().split("\n").map((line) => {
            return "<li>" + line.replace(/^\d+\. /, "") + "</li>";
        });
        return "<ol>" + items.join("") + "</ol>";
    });

    html = html
        .split(/\n{2,}/)
        .map((block) => {
            block = block.trim();
            if (!block) return "";
            if (/^<(h[1-3]|ul|ol|pre|blockquote|hr)/.test(block)) return block;
            return "<p>" + block.replace(/\n/g, "<br>") + "</p>";
        })
        .join("");

    return html;
}
