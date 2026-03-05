window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "Amazon",
  matchPattern: /amazon\.(com|in|co\.uk)/,
  isProductPage() {
    return (/\/dp\/|\/gp\/product\//).test(window.location.pathname) &&
      !!document.querySelector("#productTitle");
  },
  selectors: {
    title: "#productTitle",
    price: ".a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole",
    description: "#feature-bullets, #productDescription",
    category: "#wayfinding-breadcrumbs_container, .a-breadcrumb",
    image: "#landingImage, #imgBlkFront"
  }
});
