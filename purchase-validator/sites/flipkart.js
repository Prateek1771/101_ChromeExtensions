window.__PV_SITES = window.__PV_SITES || [];
window.__PV_SITES.push({
  name: "Flipkart",
  matchPattern: /flipkart\.com/,
  isProductPage() {
    return window.location.pathname.includes("/p/") &&
      !!document.querySelector(".VU-ZEz, ._35KyD6");
  },
  selectors: {
    title: ".VU-ZEz, ._35KyD6, h1 span",
    price: "._30jeq3, .Nx9bqj",
    description: "._1mXcCf, .yN\\+eNk, ._1AN87F",
    category: "._1MR4o5, ._2whKao",
    image: "._396cs4, ._2r_T1I img"
  }
});
