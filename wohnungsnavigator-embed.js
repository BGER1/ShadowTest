class WohnungsnavigatorEmbed extends HTMLElement {
  static get observedAttributes() {
    return ["src"];
  }

  constructor() {
    super();

    this.navigatorOrigin = "https://bger1.github.io";
    this.defaultSource = "https://bger1.github.io/ShadowTest/";
    this.lastHeight = 0;
    this.handleMessage = this.handleMessage.bind(this);

    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        height: clamp(650px, 90vh, 950px);
        margin: 0;
        padding: 0;
        overflow: hidden;
        border: 0;
        transition: height 220ms cubic-bezier(.22, .8, .2, 1);
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        border: 0;
        background: transparent;
      }

      @media (max-width: 900px) {
        :host {
          height: 900px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }
    `;

    this.frame = document.createElement("iframe");
    this.frame.title = "Wohnungsnavigator";
    this.frame.setAttribute("scrolling", "no");
    this.frame.setAttribute("allowfullscreen", "");
    this.frame.setAttribute("loading", "eager");

    shadow.append(style, this.frame);
  }

  connectedCallback() {
    this.updateSource();
    window.addEventListener("message", this.handleMessage);
  }

  disconnectedCallback() {
    window.removeEventListener("message", this.handleMessage);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src" && oldValue !== newValue && this.isConnected) {
      this.updateSource();
    }
  }

  updateSource() {
    const requestedSource = this.getAttribute("src") || this.defaultSource;

    try {
      const sourceUrl = new URL(requestedSource, window.location.href);
      if (sourceUrl.origin !== this.navigatorOrigin) return;
      this.frame.src = sourceUrl.href;
    } catch {
      this.frame.src = this.defaultSource;
    }
  }

  handleMessage(event) {
    if (event.origin !== this.navigatorOrigin) return;
    if (event.source !== this.frame.contentWindow) return;

    const message = event.data;
    if (!message || message.source !== "immowalker-wohnungsnavigator") return;
    if (message.type !== "content-height") return;

    const requestedHeight = Number(message.height);
    if (!Number.isFinite(requestedHeight)) return;

    const nextHeight = Math.round(Math.min(12000, Math.max(320, requestedHeight)));
    if (Math.abs(nextHeight - this.lastHeight) < 2) return;

    this.lastHeight = nextHeight;
    this.style.height = `${nextHeight}px`;
  }
}

if (!customElements.get("wohnungsnavigator-embed")) {
  customElements.define("wohnungsnavigator-embed", WohnungsnavigatorEmbed);
}
