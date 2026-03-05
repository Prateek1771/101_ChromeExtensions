window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "Walmart",
  matchPattern: /walmart\.com/,
  isProductPage() {
    return window.location.pathname.includes("/ip/") &&
      !!document.querySelector("h1[itemprop='name'], h1#main-title");
  },
  selectors: {
    title: "h1[itemprop='name'], h1#main-title",
    price: "span[itemprop='price'], [data-automation-id='product-price'] .f2",
    description: ".dangerous-html, [data-automation-id='product-description']",
    category: ".breadcrumb, [data-automation-id='breadcrumb']",
    image: "[data-automation-id='hero-image'] img, .hover-zoom-hero-image img"
  }
});
