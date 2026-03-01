function getArticleText() {
    const article = document.querySelector("article");
    if (article) return article.innerText;

    const main = document.querySelector("main");
    if (main) return main.innerText;

    const paragraphs = Array.from(document.querySelectorAll("p"));
    if (paragraphs.length > 0) {
        return paragraphs.map((p) => p.innerText).join("\n");
    }

    return document.body.innerText;
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.type === "GET_ARTICLE_TEXT") {
        let text = getArticleText();
        if (text && text.length > 30000) {
            text = text.substring(0, 30000);
        }
        sendResponse({ text });
    }
    return true;
});
