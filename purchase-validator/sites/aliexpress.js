window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "AliExpress",
  matchPattern: /aliexpress\.com/,
  isProductPage() {
    return window.location.pathname.includes("/item/") &&
      !!document.querySelector("h1.product-title-text, h1[data-pl='product-title']");
  },
  selectors: {
    title: "h1.product-title-text, h1[data-pl='product-title']",
    price: ".uniform-banner-box-price, .product-price-current, .es--wrap--erdmPRe",
    description: ".product-description, .detailmodule_html",
    category: ".breadcrumb--list, .comet-breadcrumb",
    image: ".magnifier-image, img.product-img"
  }
});
