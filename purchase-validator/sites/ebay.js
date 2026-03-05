window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "eBay",
  matchPattern: /ebay\.com/,
  isProductPage() {
    return window.location.pathname.includes("/itm/") &&
      !!document.querySelector("h1.x-item-title__mainTitle, h1[itemprop='name']");
  },
  selectors: {
    title: "h1.x-item-title__mainTitle, h1[itemprop='name']",
    price: ".x-price-primary .ux-textspans, #prcIsum, .x-bin-price__content .ux-textspans",
    description: "#viTabs_0_is, .x-item-description",
    category: ".seo-breadcrumb-text, nav.breadcrumbs",
    image: "#icImg, .ux-image-carousel-item img"
  }
});
