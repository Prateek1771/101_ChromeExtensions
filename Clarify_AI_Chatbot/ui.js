let _messagesEl = null;

function initUI(messagesContainer) {
    _messagesEl = messagesContainer;
}

function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;

    if (role === "assistant") {
        div.innerHTML = renderMarkdown(text);
    } else {
        div.textContent = text;
    }

    _messagesEl.appendChild(div);
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
}

function showTyping() {
    const div = document.createElement("div");
    div.className = "typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    _messagesEl.appendChild(div);
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
    return div;
}

function removeTyping(el) {
    if (el && el.parentNode) {
        el.parentNode.removeChild(el);
    }
}
